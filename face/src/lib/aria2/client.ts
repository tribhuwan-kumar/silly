import { toast } from "svelte-sonner";
import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { ItemMetaData, GlobalStat, WsMessage, Aria2Download } from './types';

export const selectedGids = writable<string[]>([]);
export const historyStore = writable<ItemMetaData[]>([]);
export const connectionState = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');

export const globalStats = writable<GlobalStat>({
  downloadSpeed: '0', uploadSpeed: '0', numActive: '0', 
  numStopped: '0', numStoppedTotal: '0', numWaiting: '0'
});


class Aria2Manager {
  private ws: WebSocket | null = null;
  private retryTimer: any = null;

  constructor() {}

  connect() {
    if (!browser || this.ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/ws/dl/history`;

    connectionState.set('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Connected to history Stream");
      connectionState.set('connected');
    };

    this.ws.onclose = () => {
      console.warn("History stream disconnected");
      connectionState.set('disconnected');
      this.ws = null;
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.connect(), 5000);
    };

    this.ws.onmessage = (event) => this.handleMessage(event);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const msg: WsMessage = JSON.parse(event.data);

      if (msg.type === 'tick') {
        globalStats.set(msg.global);

        const tasks = msg.tasks;
        console.log("tasks:", tasks);
        historyStore.update(items => {
          return items.map(item => {
            const update = tasks.find(t => t.gid === item.gid);
            if (update) {
              return {
                ...item,
                status: update.status,
                totalLength: update.totalLength,
                completedLength: update.completedLength,
                uploadedLength: update.uploadLength,
                downloadSpeed: update.downloadSpeed,
                uploadSpeed: update.uploadSpeed
              };
            }
            return item;
          });
        });

      } else if (msg.type === 'event') {
        this.handleEvent(msg.data);
      }
    } catch (e) {
      console.error("WS error", e);
    }
  }

  private handleEvent(newItem: ItemMetaData) {
    historyStore.update(items => {
      const index = items.findIndex(i => i.gid === newItem.gid);
      if (index !== -1) {
        const updated = [...items];
        updated[index] = { ...updated[index], ...newItem };
        return updated;
      } else {
        return [newItem, ...items];
      }
    });
  }

  async loadInitialData(page = 1) {
    try {
      const res = await fetch(`/api/auth/user/dl/history?page=${page}&limit=15`);
      const json = await res.json();
      if(json.data) historyStore.set(json.data);
      return json;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async delete(gids: string[], deleteFile: boolean) {
    try {
      await fetch('/api/auth/user/history/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gids, delete_file: deleteFile }) // Snake case for backend
      });

      historyStore.update(items => items.filter(i => !gids.includes(i.gid)));
      selectedGids.set([]); // Clear selection
      toast.success(`Deleted ${gids.length} items`);
    } catch (e) {
      toast.error("Delete failed");
    }
  }

  async retry(uri: string) {
    try {
      await fetch('/api/aria2/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
      });
      toast.success("Retrying download...");
    } catch(e) {
      toast.error("Retry failed");
    }
  }

  /*
   * Adds multiple URIs to the queue.
   * Multicall
  */
  async addUris(uris: string[], options: any = {}) {
    const res = await fetch('/api/aria2/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris, options })
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Failed to add uri", err);
      throw new Error(err.error || "Failed to add URIs");
    }
    toast.success(`Added ${uris.length} URIs to download`, {
      closeButton: true,
      richColors: true,
      style: "cursor: pointer;"
    });
    await this.loadInitialData(1);
    return await res.json();
  }

  /*
   * Adds multiple torrent as batch to the queue
   * Multicall
  */
  async addTorrents(torrents: { torrent: string, options?: any }[]) {
    const res = await fetch('/api/aria2/add/torrents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torrents })
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Failed to add torrents:", err);
      throw new Error(err.error || "Failed to add torrents");
    }

    toast.success(`Added ${torrents.length} torrents to download`, {
      closeButton: true,
      richColors: true,
      style: "cursor: pointer;"
    });
    await this.loadInitialData(1);
    return await res.json();
  }

  async pause(gid: string) {
    await fetch('/api/aria2/pause', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
  }

  async resume(gid: string) {
    await fetch('/api/aria2/resume', { 
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
  }

  async remove(gid: string) {
    await fetch('/api/aria2/remove', { 
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
  }
}

export const aria2 = new Aria2Manager();

export function toggleSelection(gid: string) {
  selectedGids.update(current => {
    if (current.includes(gid)) return current.filter(id => id !== gid);
    return [...current, gid];
  });
}

export function selectExclusive(gid: string) {
    selectedGids.update(current => {
        if (current.length === 1 && current[0] === gid) return [];
        return [gid];
    });
}

export function clearSelection() {
  selectedGids.set([]);
}
