import { useEffect, useState } from "react";
import { POLL_INTERVAL } from "@/types/api";
import { backend } from "../types/models";
import { app } from "@/lib/rpc";
export function useDownloadQueueData() {
  const [queueInfo, setQueueInfo] = useState<backend.DownloadQueueInfo>(
    new backend.DownloadQueueInfo({
      is_downloading: false,
      queue: [],
      current_speed: 0,
      total_downloaded: 0,
      session_start_time: 0,
      queued_count: 0,
      completed_count: 0,
      failed_count: 0,
      skipped_count: 0,
    }),
  );
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const info = await app.GetDownloadQueue();
        setQueueInfo(info);
      } catch (error) {
        console.error("Failed to get download queue:", error);
      }
    };
    fetchQueue();
    // later change it correctly
    const interval = setInterval(fetchQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return queueInfo;
}
