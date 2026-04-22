package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"silly/backend"
)

func generateSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

var currentSessionToken = generateSessionToken()

//go:embed all:frontend/dist
var assets embed.FS
// func (a *App) GetRecentFetches() (string, error) {

type AddToDownloadQueueReq struct {
	SpotifyID  string `json:"spotifyID"`
	TrackName  string `json:"trackName"`
	ArtistName string `json:"artistName"`
	AlbumName  string `json:"albumName"`
}

type CheckFilesExistenceReq struct {
	OutputDir string                      `json:"outputDir"`
	RootDir   string                      `json:"rootDir"`
	Tracks    []CheckFileExistenceRequest `json:"tracks"`
}

type CreateM3U8FileReq struct {
	M3U8Name  string   `json:"m3u8Name"`
	OutputDir string   `json:"outputDir"`
	FilePaths []string `json:"filePaths"`
}

type DeleteByIDReq struct {
	ID string `json:"id"`
}

type ClearFetchHistoryByTypeReq struct {
	ItemType string `json:"itemType"`
}

type FilesReq struct {
	Files []string `json:"files"`
}

type StreamingURLsReq struct {
	SpotifyTrackID string `json:"spotifyTrackID"`
	Region         string `json:"region"`
}

type MarkDownloadItemFailedReq struct {
	ItemID   string `json:"itemID"`
	ErrorMsg string `json:"errorMsg"`
}

type FilesFormatReq struct {
	Files  []string `json:"files"`
	Format string   `json:"format"`
}

type RenameFileToReq struct {
	OldPath string `json:"oldPath"`
	NewName string `json:"newName"`
}

type SaveSettingsReq struct {
	Settings map[string]interface{} `json:"settings"`
}

type SaveRecentFetchesReq struct {
	Payload string `json:"payload"`
}

type SkipDownloadItemReq struct {
	ItemID   string `json:"itemID"`
	FilePath string `json:"filePath"`
}

type CheckAPIStatusReq struct {
	APIType string `json:"apiType"`
	APIURL  string `json:"apiURL"`
}

type ListDirectoryFilesReq struct {
	DirPath string `json:"dirPath"`
}

func main() {
	app := NewApp()
	app.startup(context.Background())
	defer app.shutdown(context.Background())

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		panic(err)
	}

	StartBackgroundWorker(app)

	// Create the registry
	registry := make(map[string]GenericHandler)

	// Standard functions (takes struct, returns data/error)
	registry["AddToDownloadQueue"] = Wrap(func(req AddToDownloadQueueReq) (string, error) {
		return app.AddToDownloadQueue(req.SpotifyID, req.TrackName, req.ArtistName, req.AlbumName), nil
	})
	registry["CheckFilesExistence"] = Wrap(func(req CheckFilesExistenceReq) ([]CheckFileExistenceResult, error) {
		return app.CheckFilesExistence(req.OutputDir, req.RootDir, req.Tracks), nil
	})
	registry["CheckTrackAvailability"] = Wrap(app.CheckTrackAvailability)
	registry["ConvertAudio"] = Wrap(app.ConvertAudio)


	registry["CreateM3U8File"] = Wrap(func(req CreateM3U8FileReq) (struct{}, error) {
		err := app.CreateM3U8File(req.M3U8Name, req.OutputDir, req.FilePaths)
		return struct{}{}, err
	})

	registry["DeleteDownloadHistoryItem"] = Wrap(func(req DeleteByIDReq) (struct{}, error) {
		err := app.DeleteDownloadHistoryItem(req.ID)
		return struct{}{}, err
	})

	registry["DeleteFetchHistoryItem"] = Wrap(func(req DeleteByIDReq) (struct{}, error) {
		err := app.DeleteFetchHistoryItem(req.ID)
		return struct{}{}, err
	})

	registry["ClearFetchHistoryByType"] = Wrap(func(req ClearFetchHistoryByTypeReq) (struct{}, error) {
		err := app.ClearFetchHistoryByType(req.ItemType)
		return struct{}{}, err
	})

	registry["AddFetchHistory"] = Wrap(func(item backend.FetchHistoryItem) (struct{}, error) {
		err := app.AddFetchHistory(item)
		return struct{}{}, err
	})

	registry["GetFileSizes"] = Wrap(func(req FilesReq) (map[string]int64, error) {
		return app.GetFileSizes(req.Files), nil
	})

	registry["GetStreamingURLs"] = Wrap(func(req StreamingURLsReq) (string, error) {
		return app.GetStreamingURLs(req.SpotifyTrackID, req.Region)
	})

	registry["MarkDownloadItemFailed"] = Wrap(func(req MarkDownloadItemFailedReq) (struct{}, error) {
		app.MarkDownloadItemFailed(req.ItemID, req.ErrorMsg)
		return struct{}{}, nil
	})

	registry["PreviewRenameFiles"] = Wrap(func(req FilesFormatReq) ([]backend.RenamePreview, error) {
		return app.PreviewRenameFiles(req.Files, req.Format), nil
	})

	registry["RenameFilesByMetadata"] = Wrap(func(req FilesFormatReq) ([]backend.RenameResult, error) {
		return app.RenameFilesByMetadata(req.Files, req.Format), nil
	})

	registry["RenameFileTo"] = Wrap(func(req RenameFileToReq) (struct{}, error) {
		err := app.RenameFileTo(req.OldPath, req.NewName)
		return struct{}{}, err
	})

	registry["SaveRecentFetches"] = Wrap(func(req SaveRecentFetchesReq) (struct{}, error) {
		err := app.SaveRecentFetches(req.Payload)
		return struct{}{}, err
	})

	registry["CheckAPIStatus"] = Wrap(func(req CheckAPIStatusReq) (bool, error) {
		return app.CheckAPIStatus(req.APIType, req.APIURL), nil
	})

	registry["ListDirectoryFiles"] = Wrap(func(req ListDirectoryFilesReq) ([]backend.FileInfo, error) {
		return app.ListDirectoryFiles(req.DirPath)
	})

	registry["GetCurrentIPInfo"] = WrapNoArgRetErr(app.GetCurrentIPInfo)
	registry["GetRecentFetches"] = WrapNoArgRetErr(app.GetRecentFetches)
	registry["DownloadAvatar"] = Wrap(app.DownloadAvatar)
	registry["DownloadCover"] = Wrap(app.DownloadCover)
	registry["DownloadGalleryImage"] = Wrap(app.DownloadGalleryImage)
	registry["DownloadHeader"] = Wrap(app.DownloadHeader)
	registry["DownloadLyrics"] = Wrap(app.DownloadLyrics)
	registry["DownloadTrack"] = Wrap(app.DownloadTrack)
	registry["GetPreviewURL"] = Wrap(app.GetPreviewURL)
	registry["GetSpotifyMetadata"] = Wrap(app.GetSpotifyMetadata)
	registry["ListAudioFilesInDir"] = Wrap(app.ListAudioFilesInDir)


	registry["ReadFileMetadata"] = Wrap(app.ReadFileMetadata)
	registry["ReadImageAsBase64"] = Wrap(app.ReadImageAsBase64)
	registry["ReadTextFile"] = Wrap(app.ReadTextFile)


	registry["SaveSettings"] = Wrap(func(req SaveSettingsReq) (struct{}, error) {
		err := app.SaveSettings(req.Settings)
		return struct{}{}, err
	})

	registry["SkipDownloadItem"] = Wrap(func(req SkipDownloadItemReq) (struct{}, error) {
		app.SkipDownloadItem(req.ItemID, req.FilePath)
		return struct{}{}, nil
	})

	registry["SearchSpotify"] = Wrap(app.SearchSpotify)
	registry["SearchSpotifyByType"] = Wrap(app.SearchSpotifyByType)
	registry["GetUserHomeDir"] = Wrap(app.GetUserHomeDir)
	registry["GetPathSeparator"] = Wrap(app.GetPathSeparator)

	registry["AddToWatchlist"] = Wrap(app.AddToWatchlist)
	registry["RemoveFromWatchlist"] = Wrap(app.RemoveFromWatchlist)
	registry["GetWatchlists"] = Wrap(app.GetWatchlists)

	// Void input Functions (no args, returns data/error)
	registry["CancelAllQueuedItems"] = WrapNoArg(app.CancelAllQueuedItems)
	registry["ClearAllDownloads"] = WrapNoArg(app.ClearAllDownloads)
	registry["ClearCompletedDownloads"] = WrapNoArg(app.ClearCompletedDownloads)

	registry["ClearDownloadHistory"] = WrapNoArgErr(app.ClearDownloadHistory)
	registry["ClearFetchHistory"] = WrapNoArgErr(app.ClearFetchHistory)

	registry["ExportFailedDownloads"] = WrapNoArgRet(app.ExportFailedDownloads)
	registry["GetDefaults"] = WrapNoArgRet(app.GetDefaults)

	registry["CheckFFmpegInstalled"] = WrapVoid(app.CheckFFmpegInstalled)
	registry["GetConfigPath"] = WrapVoid(app.GetConfigPath)
	registry["GetDownloadHistory"] = WrapVoid(app.GetDownloadHistory)
	registry["GetFetchHistory"] = WrapVoid(app.GetFetchHistory)
	registry["IsFFmpegInstalled"] = WrapVoid(app.IsFFmpegInstalled)
	registry["IsFFprobeInstalled"] = WrapVoid(app.IsFFprobeInstalled)
	registry["LoadSettings"] = WrapVoid(app.LoadSettings)

	registry["GetDownloadQueue"] = WrapVoid(func() (backend.DownloadQueueInfo, error) {
		return app.GetDownloadQueue(), nil
	})
	registry["GetDownloadProgress"] = WrapVoid(func() (backend.ProgressInfo, error) {
		return app.GetDownloadProgress(), nil
	})

	// No error return functions
	registry["DownloadFFmpeg"] = WrapVoidNoErr(app.DownloadFFmpeg)

	// Daemon
	backend.InitWatcher(
		func(url string) (interface{}, error) {
			return app.GetSpotifyMetadata(SpotifyMetadataRequest{
				URL:     url,
				Batch:   false,
				Delay:   1.0,
				Timeout: 1000.0,
			})
		},

		func(spotifyID, trackName, artistName, albumName, coverURL, playlistName string) {
			settings, _ := app.LoadSettings()
			downloadPath, _ := settings["downloadPath"].(string)
			if downloadPath == "" { downloadPath = "." }

			service, _ := settings["downloader"].(string)
			if service == "" || service == "auto" { service = "tidal" }

			embedLyrics, _ := settings["embedLyrics"].(bool)
			embedCover, _ := settings["embedMaxQualityCover"].(bool)

			req := DownloadRequest{
				SpotifyID:            spotifyID,
				TrackName:            trackName,
				ArtistName:           artistName,
				AlbumName:            albumName,
				CoverURL:             coverURL,
				PlaylistName:         playlistName,
				OutputDir:            downloadPath,
				Service:              service,
				AudioFormat:          "LOSSLESS",
				EmbedLyrics:          embedLyrics,
				EmbedMaxQualityCover: embedCover,
				AllowFallback:        true,
			}

			app.EnqueueDownloadTrack(req)
		},
		)

	// Web server 
	mux := http.NewServeMux()

	mux.HandleFunc("/api/auth/status", func(w http.ResponseWriter, r *http.Request) {
		settings, _ := app.LoadSettings()
		appPassword, _ := settings["appPassword"].(string)

		isPasswordSet := appPassword != ""
		authenticated := false

		if isPasswordSet {
			cookie, err := r.Cookie("session_token")
			if err == nil && cookie.Value == currentSessionToken && currentSessionToken != "" {
				authenticated = true
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{
			"is_password_set": isPasswordSet,
			"authenticated":   authenticated,
		})
	})

	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Password string `json:"password"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		if req.Password == "" {
			http.Error(w, "Password cannot be empty", http.StatusBadRequest)
			return
		}

		settings, _ := app.LoadSettings()
		if settings == nil {
			settings = make(map[string]interface{})
		}
		appPassword, _ := settings["appPassword"].(string)

		if appPassword == "" {
			settings["appPassword"] = req.Password
			err := app.SaveSettings(settings)
			if err != nil {
				http.Error(w, "Failed to save config", http.StatusInternalServerError)
				return
			}
		} else if appPassword != req.Password {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    currentSessionToken,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
			MaxAge:   86400 * 15, // 15 days
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	})

	mux.HandleFunc("/api/rpc", func(w http.ResponseWriter, r *http.Request) {
		settings, _ := app.LoadSettings()
		if appPassword, ok := settings["appPassword"].(string); ok && appPassword != "" {
			cookie, err := r.Cookie("session_token")
			if err != nil || cookie.Value != currentSessionToken {
				http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
				return
			}
		}
		// If authenticated or auth is disabled, process the RPC
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

