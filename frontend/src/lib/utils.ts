import { twMerge } from "tailwind-merge";
import type { Settings } from "./settings";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizePath(input: string, os: string): string {
  const sanitized = input.trim();
  if (os === "Windows") {
    return sanitized.replace(/[<>:"/\\|?*]/g, "_");
  }
  return sanitized.replace(/\//g, "_");
}

export function joinPath(os: string, ...parts: string[]): string {
  const sep = os === "windows" ? "\\" : "/";
  const filtered = parts.filter((part) => part && part.trim().length > 0);
  if (filtered.length === 0) return "";

  return filtered
    .map((p, i) => {
      const trimmed = p.trim();
      if (i === 0) {
        return trimmed.replace(/[/\\]+$/g, "");
      }
      return trimmed.replace(/^[/\\]+|[/\\]+$/g, "");
    })
    .filter(Boolean)
    .join(sep);
}

export function buildOutputPath(settings: Settings, folder?: string) {
  const os = settings.operatingSystem;
  const base = (settings.downloadPath || "").trim();
  if (!folder?.trim()) return base;

  const sanitizedFolder = sanitizePath(folder, os);
  return joinPath(os, base, sanitizedFolder);
}

export function openExternal(url: string) {
  if (!url) return;
  try {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (e) {
    console.error("error", e);
  }
}

export function getFirstArtist(artistString: string): string {
    if (!artistString)
        return artistString;
    const delimiters = /[,&]|(?:\s+(?:feat\.?|ft\.?|featuring)\s+)/i;
    const parts = artistString.split(delimiters);
    return parts[0].trim();
}
