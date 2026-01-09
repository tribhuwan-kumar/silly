import { toast } from 'svelte-sonner';
import { writable } from "svelte/store";
import { browser } from '$app/environment';

export interface SystemStatus {
  version: string;
  adminExists: boolean;
  aria2Alive: boolean;
}

export const systemState = writable<{
  status: SystemStatus | null;
}>({
  status: null
});

let ws: WebSocket | null = null;

export function getSysStatus(): void {
  if (!browser || ws) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/api/ws/silly/status`;

  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data: SystemStatus = JSON.parse(event.data);
      console.log("sys status", data);
      systemState.set({ status: data });
      if (data.aria2Alive === false) {
        toast.error("aria2 daemon isn't running ` ᴖ ´",{
          duration: 10000,
          richColors: true,
          style: "cursor: pointer;",
        })
      }
    } catch (e) {
      console.error("getSysStatus:", e)
    }
  };

  ws.onclose = () => {
    toast.error("Silly isn't alive ˙◠˙",{
      duration: 10000,
      richColors: true,
      style: "cursor: pointer;",
    })
    ws = null;
    setTimeout(getSysStatus, 11000);
  };
}
