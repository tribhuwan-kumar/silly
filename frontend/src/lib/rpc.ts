import { main, backend } from "@/types/models";
import { toastWithSound as toast } from "@/lib/toast-with-sound";

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
    const errorMessage = e instanceof Error ? e.message : String(e);
    toast.error(errorMessage);
    console.error(`RPC Error [${method}]:`, e);
    throw e;
  }
}

/**
 * AppClient acts as a drop-in replacement for the Wails App bindings.
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

  async DownloadTrack(req: main.DownloadRequest): Promise<main.DownloadResponse> {
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
  async GetSpotifyMetadata(req: main.SpotifyMetadataRequest): Promise<any> {
    return invoke("GetSpotifyMetadata", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetStreamingURLs( spotifyTrackID: string, region: string,): Promise<any> {
    return invoke("GetStreamingURLs", {
      spotify_track_id: spotifyTrackID,
      region,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async CheckTrackAvailability(spotifyTrackID: string): Promise<any> {
    return invoke("CheckTrackAvailability", {
      spotify_track_id: spotifyTrackID,
    });
  }

  async SearchSpotify(req: main.SpotifySearchRequest): Promise<backend.SearchResponse> {
    return invoke("SearchSpotify", req);
  }

  async SearchSpotifyByType(req: main.SpotifySearchByTypeRequest): Promise<Array<backend.SearchResult>> {
    return invoke("SearchSpotifyByType", req);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetPreviewURL(trackID: string): Promise<any> {
    return invoke("GetPreviewURL", { track_id: trackID });
  }

  async DownloadAvatar(req: main.AvatarDownloadRequest): Promise<backend.AvatarDownloadResponse> {
    return invoke("DownloadAvatar", req);
  }

  async DownloadCover(req: main.CoverDownloadRequest): Promise<backend.CoverDownloadResponse> {
    return invoke("DownloadCover", req);
  }

  async DownloadGalleryImage(req: main.GalleryImageDownloadRequest): Promise<backend.GalleryImageDownloadResponse> {
    return invoke("DownloadGalleryImage", req);
  }

  async DownloadHeader(req: main.HeaderDownloadRequest): Promise<backend.HeaderDownloadResponse> {
    return invoke("DownloadHeader", req);
  }

  async DownloadLyrics(req: main.LyricsDownloadRequest): Promise<backend.LyricsDownloadResponse> {
    return invoke("DownloadLyrics", req);
  }

  // --- 4. History Management ---

  async AddFetchHistory(item: backend.FetchHistoryItem): Promise<void> {
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

  async GetDownloadHistory(): Promise<Array<backend.HistoryItem>> {
    return invoke("GetDownloadHistory");
  }

  async GetFetchHistory(): Promise<Array<backend.FetchHistoryItem>> {
    return invoke("GetFetchHistory");
  }

  async CheckFilesExistence(
    outputDir: string,
    rootDir: string,
    tracks: Array<main.CheckFileExistenceRequest>,
  ): Promise<Array<main.CheckFileExistenceResult>> {
    return invoke("CheckFilesExistence", {
      output_dir: outputDir,
      root_dir: rootDir,
      tracks,
    });
  }

  async ConvertAudio(req: main.ConvertAudioRequest): Promise<Array<backend.ConvertAudioResult>> {
    return invoke("ConvertAudio", req);
  }

  async CreateM3U8File(
    m3u8Name: string,
    outputDir: string,
    filePaths: Array<string>,
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

  async ListAudioFilesInDir(dirPath: string): Promise<Array<backend.FileInfo>> {
    return invoke("ListAudioFilesInDir", { dir_path: dirPath });
  }

  async ListDirectoryFiles(dirPath: string): Promise<Array<backend.FileInfo>> {
    return invoke("ListDirectoryFiles", { dir_path: dirPath });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetUserHomeDir(): Promise<any> {
    return invoke("GetUserHomeDir", {});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetPathSeparator(): Promise<any> {
    return invoke("GetPathSeparator", {});
  }

  async PreviewRenameFiles(files: string[], format: string): Promise<Array<backend.RenamePreview>> {
    return invoke("PreviewRenameFiles", { files, format });
  }

  async ReadFileMetadata(filePath: string): Promise<backend.AudioMetadata> {
    return invoke("ReadFileMetadata", { file_path: filePath });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ReadImageAsBase64(filePath: string): Promise<any> {
    return invoke("ReadImageAsBase64", { file_path: filePath });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ReadTextFile(filePath: string): Promise<any> {
    return invoke("ReadTextFile", { file_path: filePath });
  }

  async RenameFileTo(oldPath: string, newName: string): Promise<void> {
    return invoke("RenameFileTo", { old_path: oldPath, new_name: newName });
  }

  async RenameFilesByMetadata(files: string[], format: string): Promise<Array<backend.RenameResult>> {
    return invoke("RenameFilesByMetadata", { files, format });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async UploadImage(filePath: string): Promise<any> {
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

  async DownloadFFmpeg(): Promise<main.DownloadFFmpegResponse> {
    return invoke("DownloadFFmpeg");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ExportFailedDownloads(): Promise<any> {
    return invoke("ExportFailedDownloads");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetConfigPath(): Promise<any> {
    return invoke("GetConfigPath");
  }

  async GetDefaults(): Promise<Record<string, string>> {
    return invoke("GetDefaults");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetFFmpegPath(): Promise<any> {
    return invoke("GetFFmpegPath");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async GetOSInfo(): Promise<any> {
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

  async GetDownloadProgress(): Promise<backend.ProgressInfo> {
    return invoke("GetDownloadProgress");
  }

  async GetDownloadQueue(): Promise<backend.DownloadQueueInfo> {
    return invoke("GetDownloadQueue");
  }
}

// Export a singleton instance to act just like the old Wails import
export const app = new AppClient();
