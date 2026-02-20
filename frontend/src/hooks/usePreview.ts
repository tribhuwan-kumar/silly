import { useState, useEffect, useRef } from "react";
import { app } from "@/lib/rpc";
import { toast } from "sonner";
export function usePreview() {
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);
  const playPreview = async (trackId: string, trackName: string) => {
    try {
      const currentAudio = audioRef.current;
      if (playingTrack === trackId && currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setPlayingTrack(null);
        setCurrentAudio(null);
        return;
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setPlayingTrack(null);
      }
      setLoadingPreview(trackId);
      const previewURL = await app.GetPreviewURL(trackId);
      if (!previewURL) {
        toast.error("Preview not available", {
          description: `No preview found for "${trackName}"`,
        });
        setLoadingPreview(null);
        return;
      }
      const audio = new Audio(previewURL);
      audio.addEventListener("loadeddata", () => {
        setLoadingPreview(null);
        setPlayingTrack(trackId);
      });
      audio.addEventListener("ended", () => {
        setPlayingTrack(null);
        setCurrentAudio(null);
      });
      audio.addEventListener("error", () => {
        toast.error("Failed to play preview", {
          description: `Could not play preview for "${trackName}"`,
        });
        setLoadingPreview(null);
        setPlayingTrack(null);
        setCurrentAudio(null);
      });
      setCurrentAudio(audio);
      await audio.play();
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error("Preview error:", error);
      toast.error("Preview not available", {
        description:
          error?.message || `Could not load preview for "${trackName}"`,
      });
      setLoadingPreview(null);
      setPlayingTrack(null);
    }
  };
  const stopPreview = () => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingTrack(null);
    }
  };
  return {
    playPreview,
    stopPreview,
    loadingPreview,
    playingTrack,
  };
}
