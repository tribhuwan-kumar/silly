// Define the base RPC response structure
interface RPCResponse<T> {
  result?: T;
  error?: string;
}

/**
 * Core invoker that sends POST requests to your Go server.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke<T>(method: string, params: any = {}): Promise<T> {
  try {
    const response = await fetch("/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method, params }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data: RPCResponse<T> = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.result as T;
  } catch (e) {
    console.error(`RPC Error [${method}]:`, e);
    throw e;
  }
}

/**
 * AppClient acts as a drop-in replacement for the Wails App bindings.
 * It maps the old multi-argument signatures to the new struct-based JSON payloads.
 * * Note: Types are set to 'any' for complex models to prevent compilation errors,
 * you can replace 'any' with your actual imported types from '../models' if you kept them.
 */
export class AppClient {
  // --- 1. Queue & Downloading ---

  async AddToDownloadQueue(
    spotifyID: string,
    trackName: string,
    artistName: string,
    albumName: string,
  ): Promise<string> {
    return invoke("AddToDownloadQueue", {
      spotify_id: spotifyID,
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadTrack(req: any): Promise<any> {
    return invoke("DownloadTrack", req);
  }

  async CancelAllQueuedItems(): Promise<void> {
    return invoke("CancelAllQueuedItems");
  }

  async ClearAllDownloads(): Promise<void> {
    return invoke("ClearAllDownloads");
  }

  async ClearCompletedDownloads(): Promise<void> {
    return invoke("ClearCompletedDownloads");
  }

  async MarkDownloadItemFailed(
    itemID: string,
    errorMsg: string,
  ): Promise<void> {
    return invoke("MarkDownloadItemFailed", {
      item_id: itemID,
      error_msg: errorMsg,
    });
  }

  async SkipDownloadItem(itemID: string, filePath: string): Promise<void> {
    return invoke("SkipDownloadItem", { item_id: itemID, file_path: filePath });
  }

  // --- 2. Information Retrieval & API ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetSpotifyMetadata(req: any): Promise<string> {
    // Returns JSON string in old implementation, consider changing React to handle the raw object directly
    return invoke("GetSpotifyMetadata", req);
  }

  async GetStreamingURLs(
    spotifyTrackID: string,
    region: string,
  ): Promise<string> {
    return invoke("GetStreamingURLs", {
      spotify_track_id: spotifyTrackID,
      region,
    });
  }

  async CheckTrackAvailability(spotifyTrackID: string): Promise<string> {
    return invoke("CheckTrackAvailability", {
      spotify_track_id: spotifyTrackID,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async SearchSpotify(req: any): Promise<any> {
    return invoke("SearchSpotify", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async SearchSpotifyByType(req: any): Promise<any[]> {
    return invoke("SearchSpotifyByType", req);
  }

  async GetPreviewURL(trackID: string): Promise<string> {
    return invoke("GetPreviewURL", { track_id: trackID });
  }

  // --- 3. Extra Downloads (Covers, Lyrics, Headers) ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadAvatar(req: any): Promise<any> {
    return invoke("DownloadAvatar", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadCover(req: any): Promise<any> {
    return invoke("DownloadCover", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadGalleryImage(req: any): Promise<any> {
    return invoke("DownloadGalleryImage", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadHeader(req: any): Promise<any> {
    return invoke("DownloadHeader", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadLyrics(req: any): Promise<any> {
    return invoke("DownloadLyrics", req);
  }

  // --- 4. History Management ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async AddFetchHistory(item: any): Promise<void> {
    return invoke("AddFetchHistory", item);
  }

  async ClearDownloadHistory(): Promise<void> {
    return invoke("ClearDownloadHistory");
  }

  async ClearFetchHistory(): Promise<void> {
    return invoke("ClearFetchHistory");
  }

  async ClearFetchHistoryByType(itemType: string): Promise<void> {
    return invoke("ClearFetchHistoryByType", { item_type: itemType });
  }

  async DeleteDownloadHistoryItem(id: string): Promise<void> {
    return invoke("DeleteDownloadHistoryItem", { id });
  }

  async DeleteFetchHistoryItem(id: string): Promise<void> {
    return invoke("DeleteFetchHistoryItem", { id });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetDownloadHistory(): Promise<any[]> {
    return invoke("GetDownloadHistory");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetFetchHistory(): Promise<any[]> {
    return invoke("GetFetchHistory");
  }

  // --- 5. File Operations & Analysis ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async AnalyzeMultipleTracks(filePaths: string[]): Promise<any[]> {
    return invoke("AnalyzeMultipleTracks", { file_paths: filePaths });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async AnalyzeTrack(filePath: string): Promise<any> {
    return invoke("AnalyzeTrack", { file_path: filePath });
  }

  async CheckFilesExistence(
    outputDir: string,
    rootDir: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tracks: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return invoke("CheckFilesExistence", {
      output_dir: outputDir,
      root_dir: rootDir,
      tracks,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ConvertAudio(req: any): Promise<any[]> {
    return invoke("ConvertAudio", req);
  }

  async CreateM3U8File(
    m3u8Name: string,
    outputDir: string,
    filePaths: string[],
  ): Promise<void> {
    return invoke("CreateM3U8File", {
      m3u8_name: m3u8Name,
      output_dir: outputDir,
      file_paths: filePaths,
    });
  }

  async GetFileSizes(filePaths: string[]): Promise<Record<string, number>> {
    return invoke("GetFileSizes", { file_paths: filePaths });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ListAudioFilesInDir(dirPath: string): Promise<any[]> {
    return invoke("ListAudioFilesInDir", { dir_path: dirPath });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ListDirectoryFiles(dirPath: string): Promise<any[]> {
    return invoke("ListDirectoryFiles", { dir_path: dirPath });
  }

  async GetUserHomeDir(): Promise<string> {
    return invoke("GetUserHomeDir", {});
  }

  async GetPathSeparator(): Promise<string> {
    return invoke("GetPathSeparator", {});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async PreviewRenameFiles(files: string[], format: string): Promise<any[]> {
    return invoke("PreviewRenameFiles", { files, format });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ReadFileMetadata(filePath: string): Promise<any> {
    return invoke("ReadFileMetadata", { file_path: filePath });
  }

  async ReadImageAsBase64(filePath: string): Promise<string> {
    return invoke("ReadImageAsBase64", { file_path: filePath });
  }

  async ReadTextFile(filePath: string): Promise<string> {
    return invoke("ReadTextFile", { file_path: filePath });
  }

  async RenameFileTo(oldPath: string, newName: string): Promise<void> {
    return invoke("RenameFileTo", { old_path: oldPath, new_name: newName });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async RenameFilesByMetadata(files: string[], format: string): Promise<any[]> {
    return invoke("RenameFilesByMetadata", { files, format });
  }

  async UploadImage(filePath: string): Promise<string> {
    return invoke("UploadImage", { file_path: filePath });
  }

  async UploadImageBytes(
    filename: string,
    base64Data: string,
  ): Promise<string> {
    return invoke("UploadImageBytes", { filename, base64_data: base64Data });
  }

  // --- 6. System, Config & FFmpeg ---

  async CheckFFmpegInstalled(): Promise<boolean> {
    return invoke("CheckFFmpegInstalled");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async DownloadFFmpeg(): Promise<any> {
    return invoke("DownloadFFmpeg");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ExportFailedDownloads(): Promise<any> {
    return invoke("ExportFailedDownloads");
  }

  async GetConfigPath(): Promise<string> {
    return invoke("GetConfigPath");
  }

  async GetDefaults(): Promise<Record<string, string>> {
    return invoke("GetDefaults");
  }

  async GetFFmpegPath(): Promise<string> {
    return invoke("GetFFmpegPath");
  }

  async GetOSInfo(): Promise<string> {
    return invoke("GetOSInfo");
  }

  async IsFFmpegInstalled(): Promise<boolean> {
    return invoke("IsFFmpegInstalled");
  }

  async IsFFprobeInstalled(): Promise<boolean> {
    return invoke("IsFFprobeInstalled");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async LoadSettings(): Promise<Record<string, any>> {
    return invoke("LoadSettings");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async SaveSettings(settings: Record<string, any>): Promise<void> {
    return invoke("SaveSettings", { settings });
  }

  // --- 7. State Retrieval (Usually called via intervals) ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetDownloadProgress(): Promise<any> {
    return invoke("GetDownloadProgress");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetDownloadQueue(): Promise<any> {
    return invoke("GetDownloadQueue");
  }
}

// Export a singleton instance to act just like the old Wails import
export const app = new AppClient();
