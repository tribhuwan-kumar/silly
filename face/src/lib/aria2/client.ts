import { toast } from "svelte-sonner";
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Aria2Download, Aria2GlobalStat } from './types';

export const connectionState = writable<
'disconnected'
| 'connecting' 
| 'connected'
>('disconnected');

export const globalStats = writable<Aria2GlobalStat>({
  downloadSpeed: '0',
  uploadSpeed: '0',
  numActive: '0',
  numWaiting: '0',
  numStopped: '0',
  numStoppedTotal: '0'
});

export const selectedGids = writable<string[]>([]);
export const activeDownloads = writable<Aria2Download[]>([]);
export const waitingDownloads = writable<Aria2Download[]>([]);
export const stoppedDownloads = writable<Aria2Download[]>([]);

const SYNC_INTERVAL_MS = 1000;
let syncInterval: any = null;
let ws: WebSocket | null = null;
let retryTimer: any = null;

class Aria2Manager {
  connect() {
    if (!browser || ws) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/ws`;

    connectionState.set('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("Listening aria2 events");
      connectionState.set('connected');
      this.startLoop();
    };

    ws.onclose = () => {
      console.warn("Disconnected from silly");
      connectionState.set('disconnected');
      this.stopLoop();
      ws = null;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => this.connect(), 3000);
    };

    ws.onmessage = (event) => {
      this.syncDashboard();
    };
  }

  async syncDashboard() {
    // connect WebSocket directly and keep syncing the syncDashboard
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/dl/history`;
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

    this.syncDashboard();
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

    this.syncDashboard();
    return await res.json();
  }

  async pause(gid: string) {
    await fetch('/api/aria2/pause', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
    this.syncDashboard();
  }

  async resume(gid: string) {
    await fetch('/api/aria2/resume', { 
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
    this.syncDashboard();
  }

  async remove(gid: string) {
    await fetch('/api/aria2/remove', { 
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gid }) 
    });
    this.syncDashboard();
  }

  private startLoop() {
    this.syncDashboard();
    if (!syncInterval) {
      syncInterval = setInterval(() => this.syncDashboard(), SYNC_INTERVAL_MS);
    }
  }

  private stopLoop() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }
}


export const aria2 = new Aria2Manager();

export function toggleSelection(gid: string) {
  selectedGids.update(current => {
    if (current.includes(gid)) {
      return current.filter(id => id !== gid);
    } else {
      return [...current, gid];
    }
  });
}

export function clearSelection() {
  selectedGids.set([]);
}
