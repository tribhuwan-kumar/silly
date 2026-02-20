package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"silly/backend"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	app.startup(context.Background())
	defer app.shutdown(context.Background())

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		panic(err)
	}

	// Create the registry
	registry := make(map[string]GenericHandler)

	// Standard Functions (Takes Struct, Returns Data/Error)
	registry["AddToDownloadQueue"] = Wrap(app.AddToDownloadQueue)
	registry["AnalyzeMultipleTracks"] = Wrap(app.AnalyzeMultipleTracks)
	registry["AnalyzeTrack"] = Wrap(app.AnalyzeTrack)
	registry["CheckFilesExistence"] = Wrap(app.CheckFilesExistence)
	registry["CheckTrackAvailability"] = Wrap(app.CheckTrackAvailability)
	registry["ConvertAudio"] = Wrap(app.ConvertAudio)
	registry["CreateM3U8File"] = Wrap(app.CreateM3U8File)
	registry["DeleteDownloadHistoryItem"] = Wrap(app.DeleteDownloadHistoryItem)
	registry["DeleteFetchHistoryItem"] = Wrap(app.DeleteFetchHistoryItem)
	registry["ClearFetchHistoryByType"] = Wrap(app.ClearFetchHistoryByType)
	registry["AddFetchHistory"] = Wrap(app.AddFetchHistory)
	registry["DownloadAvatar"] = Wrap(app.DownloadAvatar)
	registry["DownloadCover"] = Wrap(app.DownloadCover)
	registry["DownloadGalleryImage"] = Wrap(app.DownloadGalleryImage)
	registry["DownloadHeader"] = Wrap(app.DownloadHeader)
	registry["DownloadLyrics"] = Wrap(app.DownloadLyrics)
	registry["DownloadTrack"] = Wrap(app.DownloadTrack)
	registry["GetFileSizes"] = Wrap(app.GetFileSizes)
	registry["GetPreviewURL"] = Wrap(app.GetPreviewURL)
	registry["GetSpotifyMetadata"] = Wrap(app.GetSpotifyMetadata)
	registry["GetStreamingURLs"] = Wrap(app.GetStreamingURLs)
	registry["ListAudioFilesInDir"] = Wrap(app.ListAudioFilesInDir)
	registry["ListDirectoryFiles"] = Wrap(app.ListDirectoryFiles)
	registry["MarkDownloadItemFailed"] = Wrap(app.MarkDownloadItemFailed)
	registry["PreviewRenameFiles"] = Wrap(app.PreviewRenameFiles)
	registry["ReadFileMetadata"] = Wrap(app.ReadFileMetadata)
	registry["ReadImageAsBase64"] = Wrap(app.ReadImageAsBase64)
	registry["ReadTextFile"] = Wrap(app.ReadTextFile)
	registry["RenameFilesByMetadata"] = Wrap(app.RenameFilesByMetadata)
	registry["RenameFileTo"] = Wrap(app.RenameFileTo)
	registry["SaveSettings"] = Wrap(app.SaveSettings)
	registry["SearchSpotify"] = Wrap(app.SearchSpotify)
	registry["SearchSpotifyByType"] = Wrap(app.SearchSpotifyByType)
	registry["SkipDownloadItem"] = Wrap(app.SkipDownloadItem)
	registry["UploadImage"] = Wrap(app.UploadImage)
	registry["UploadImageBytes"] = Wrap(app.UploadImageBytes)

	// Void Input Functions (No args, Returns Data/Error)
	registry["CancelAllQueuedItems"] = WrapVoid(app.CancelAllQueuedItems)
	registry["CheckFFmpegInstalled"] = WrapVoid(app.CheckFFmpegInstalled)
	registry["ClearAllDownloads"] = WrapVoid(app.ClearAllDownloads)
	registry["ClearCompletedDownloads"] = WrapVoid(app.ClearCompletedDownloads)
	registry["ClearDownloadHistory"] = WrapVoid(app.ClearDownloadHistory)
	registry["ClearFetchHistory"] = WrapVoid(app.ClearFetchHistory)
	registry["ExportFailedDownloads"] = WrapVoid(app.ExportFailedDownloads)
	registry["GetConfigPath"] = WrapVoid(app.GetConfigPath)
	registry["GetDefaults"] = WrapVoid(app.GetDefaults)
	registry["GetDownloadHistory"] = WrapVoid(app.GetDownloadHistory)
	registry["GetFetchHistory"] = WrapVoid(app.GetFetchHistory)
	registry["GetFFmpegPath"] = WrapVoid(app.GetFFmpegPath)
	registry["GetOSInfo"] = WrapVoid(app.GetOSInfo)
	registry["IsFFmpegInstalled"] = WrapVoid(app.IsFFmpegInstalled)
	registry["IsFFprobeInstalled"] = WrapVoid(app.IsFFprobeInstalled)
	registry["LoadSettings"] = WrapVoid(app.LoadSettings)


	registry["GetUserHomeDir"] = Wrap(app.GetUserHomeDir)
	registry["GetPathSeparator"] = Wrap(app.GetPathSeparator)

	// Adapter for items that only return data, no error
	registry["GetDownloadQueue"] = WrapVoid(func() (backend.DownloadQueueInfo, error) {
		return app.GetDownloadQueue(), nil
	})
	registry["GetDownloadProgress"] = WrapVoid(func() (backend.ProgressInfo, error) {
		return app.GetDownloadProgress(), nil
	})

	// No Error Return Functions
	registry["DownloadFFmpeg"] = WrapVoidNoErr(app.DownloadFFmpeg)

	// Web server 
	mux := http.NewServeMux()

	mux.HandleFunc("/api/rpc", func(w http.ResponseWriter, r *http.Request) {
		HandleRPC(registry, w, r)
	})

	mux.Handle("/", http.FileServer(http.FS(distFS)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "6890" // fixing, fav port :)
	}

	fmt.Printf("Silly web server running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		panic(err)
	}
}

