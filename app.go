package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"silly/backend"
	"strings"
	"time"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) getFirstArtist(artistString string) string {
	if artistString == "" {
		return ""
	}
	delimiters := []string{", ", " & ", " feat. ", " ft. ", " featuring "}
	for _, d := range delimiters {
		if idx := strings.Index(strings.ToLower(artistString), d); idx != -1 {
			return strings.TrimSpace(artistString[:idx])
		}
	}
	return artistString
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := backend.InitHistoryDB("Silly"); err != nil {
		fmt.Printf("Failed to init history DB: %v\n", err)
	}
}

func (a *App) shutdown(ctx context.Context) {
	backend.CloseHistoryDB()
}

type StreamingURLsReq struct {
	SpotifyTrackID string `json:"spotify_track_id"`
	Region         string `json:"region"`
}
type AvailabilityReq struct {
	SpotifyTrackID string `json:"spotify_track_id"`
}
type FileReq struct {
	FilePath string `json:"file_path"`
}
type FilesReq struct {
	FilePaths []string `json:"file_paths"`
}
type AnalyzeTrackReq struct {
	FilePath string `json:"file_path"`
}
type DirReq struct {
	DirPath string `json:"dir_path"`
}
type RenameReq struct {
	Files  []string `json:"files"`
	Format string   `json:"format"`
}
type RenameFileReq struct {
	OldPath string `json:"old_path"`
	NewName string `json:"new_name"`
}
type SkipReq struct {
	ItemID   string `json:"item_id"`
	FilePath string `json:"file_path"`
}
type TrackReq struct {
	TrackID string `json:"track_id"`
}
type IDReq struct {
	ID string `json:"id"`
}
type AddQueueReq struct {
	SpotifyID  string `json:"spotify_id"`
	TrackName  string `json:"track_name"`
	ArtistName string `json:"artist_name"`
	AlbumName  string `json:"album_name"`
}
type MarkFailedReq struct {
	ItemID   string `json:"item_id"`
	ErrorMsg string `json:"error_msg"`
}
type UploadBytesReq struct {
	Filename   string `json:"filename"`
	Base64Data string `json:"base64_data"`
}
type SaveSettingsReq struct {
	Settings map[string]interface{} `json:"settings"`
}
type CreateM3U8Req struct {
	M3U8Name  string   `json:"m3u8_name"`
	OutputDir string   `json:"output_dir"`
	FilePaths []string `json:"file_paths"`
}
type CheckExistenceReq struct {
	OutputDir string                      `json:"output_dir"`
	RootDir   string                      `json:"root_dir"`
	Tracks    []CheckFileExistenceRequest `json:"tracks"`
}

type SpotifyMetadataRequest struct {
	URL     string  `json:"url"`
	Batch   bool    `json:"batch"`
	Delay   float64 `json:"delay"`
	Timeout float64 `json:"timeout"`
}

type DownloadRequest struct {
	Service              string `json:"service"`
	Query                string `json:"query,omitempty"`
	TrackName            string `json:"track_name,omitempty"`
	ArtistName           string `json:"artist_name,omitempty"`
	AlbumName            string `json:"album_name,omitempty"`
	AlbumArtist          string `json:"album_artist,omitempty"`
	ReleaseDate          string `json:"release_date,omitempty"`
	CoverURL             string `json:"cover_url,omitempty"`
	ApiURL               string `json:"api_url,omitempty"`
	OutputDir            string `json:"output_dir,omitempty"`
	AudioFormat          string `json:"audio_format,omitempty"`
	FilenameFormat       string `json:"filename_format,omitempty"`
	TrackNumber          bool   `json:"track_number,omitempty"`
	Position             int    `json:"position,omitempty"`
	UseAlbumTrackNumber  bool   `json:"use_album_track_number,omitempty"`
	SpotifyID            string `json:"spotify_id,omitempty"`
	EmbedLyrics          bool   `json:"embed_lyrics,omitempty"`
	EmbedMaxQualityCover bool   `json:"embed_max_quality_cover,omitempty"`
	ServiceURL           string `json:"service_url,omitempty"`
	Duration             int    `json:"duration,omitempty"`
	ItemID               string `json:"item_id,omitempty"`
	SpotifyTrackNumber   int    `json:"spotify_track_number,omitempty"`
	SpotifyDiscNumber    int    `json:"spotify_disc_number,omitempty"`
	SpotifyTotalTracks   int    `json:"spotify_total_tracks,omitempty"`
	SpotifyTotalDiscs    int    `json:"spotify_total_discs,omitempty"`
	Copyright            string `json:"copyright,omitempty"`
	Publisher            string `json:"publisher,omitempty"`
	PlaylistName         string `json:"playlist_name,omitempty"`
	PlaylistOwner        string `json:"playlist_owner,omitempty"`
	AllowFallback        bool   `json:"allow_fallback"`
	UseFirstArtistOnly   bool   `json:"use_first_artist_only,omitempty"`
}

type DownloadResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	File          string `json:"file,omitempty"`
	Error         string `json:"error,omitempty"`
	AlreadyExists bool   `json:"already_exists,omitempty"`
	ItemID        string `json:"item_id,omitempty"`
}

func (a *App) GetStreamingURLs(req StreamingURLsReq) (interface{}, error) {
	if req.SpotifyTrackID == "" {
		return nil, fmt.Errorf("spotify track ID is required")
	}
	client := backend.NewSongLinkClient()
	return client.GetAllURLsFromSpotify(req.SpotifyTrackID, req.Region)
}

func (a *App) GetSpotifyMetadata(req SpotifyMetadataRequest) (interface{}, error) {
	if req.URL == "" {
		return nil, fmt.Errorf("URL parameter is required")
	}
	if req.Delay == 0 {
		req.Delay = 1.0
	}
	if req.Timeout == 0 {
		req.Timeout = 300.0
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(req.Timeout*float64(time.Second)))
	defer cancel()

	settings, err := a.LoadSettings()
	if err == nil && settings != nil {
		if useAPI, ok := settings["useSpotFetchAPI"].(bool); ok && useAPI {
			if apiURL, ok := settings["spotFetchAPIUrl"].(string); ok && apiURL != "" {
				data, err := backend.GetSpotifyDataWithAPI(ctx, req.URL, true, apiURL, req.Batch, time.Duration(req.Delay*float64(time.Second)))
				if err != nil {
					return nil, fmt.Errorf("failed to fetch metadata from API: %v", err)
				}
				return data, nil
			}
		}
	}

	data, err := backend.GetFilteredSpotifyData(ctx, req.URL, req.Batch, time.Duration(req.Delay*float64(time.Second)))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch metadata: %v", err)
	}
	return data, nil
}

type SpotifySearchRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit"`
}

func (a *App) SearchSpotify(req SpotifySearchRequest) (*backend.SearchResponse, error) {
	if req.Query == "" {
		return nil, fmt.Errorf("search query is required")
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return backend.SearchSpotify(ctx, req.Query, req.Limit)
}

type SpotifySearchByTypeRequest struct {
	Query      string `json:"query"`
	SearchType string `json:"search_type"`
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
}

func (a *App) SearchSpotifyByType(req SpotifySearchByTypeRequest) ([]backend.SearchResult, error) {
	if req.Query == "" {
		return nil, fmt.Errorf("search query is required")
	}
	if req.SearchType == "" {
		return nil, fmt.Errorf("search type is required")
	}
	if req.Limit <= 0 {
		req.Limit = 50
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return backend.SearchSpotifyByType(ctx, req.Query, req.SearchType, req.Limit, req.Offset)
}

func (a *App) DownloadTrack(req DownloadRequest) (DownloadResponse, error) {
	if req.Service == "qobuz" && req.SpotifyID == "" {
		return DownloadResponse{Success: false, Error: "Spotify ID is required for Qobuz"}, fmt.Errorf("spotify ID is required for Qobuz")
	}
	if req.Service == "" {
		req.Service = "tidal"
	}
	if req.OutputDir == "" {
		req.OutputDir = "."
	} else {
		if req.PlaylistName != "" {
			sanitizedPlaylist := backend.SanitizeFilename(req.PlaylistName)
			req.OutputDir = filepath.Join(req.OutputDir, sanitizedPlaylist)
		}
		req.OutputDir = backend.SanitizeFolderPath(req.OutputDir)
	}
	if req.AudioFormat == "" {
		req.AudioFormat = "LOSSLESS"
	}

	var err error
	var filename string

	if req.FilenameFormat == "" {
		req.FilenameFormat = "title-artist"
	}

	itemID := req.ItemID
	if itemID == "" {
		if req.SpotifyID != "" {
			itemID = fmt.Sprintf("%s-%d", req.SpotifyID, time.Now().UnixNano())
		} else {
			itemID = fmt.Sprintf("%s-%s-%d", req.TrackName, req.ArtistName, time.Now().UnixNano())
		}
		backend.AddToQueue(itemID, req.TrackName, req.ArtistName, req.AlbumName, req.SpotifyID)
	}

	backend.SetDownloading(true)
	backend.StartDownloadItem(itemID)
	defer backend.SetDownloading(false)

	spotifyURL := ""
	if req.SpotifyID != "" {
		spotifyURL = fmt.Sprintf("https://open.spotify.com/track/%s", req.SpotifyID)
	}

	if req.SpotifyID != "" && (req.Copyright == "" || req.Publisher == "" || req.SpotifyTotalDiscs == 0 || req.ReleaseDate == "" || req.SpotifyTotalTracks == 0 || req.SpotifyTrackNumber == 0) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		trackURL := fmt.Sprintf("https://open.spotify.com/track/%s", req.SpotifyID)
		trackData, err := backend.GetFilteredSpotifyData(ctx, trackURL, false, 0)
		if err == nil {
			var trackResp struct {
				Track struct {
					Copyright   string `json:"copyright"`
					Publisher   string `json:"publisher"`
					TotalDiscs  int    `json:"total_discs"`
					TotalTracks int    `json:"total_tracks"`
					TrackNumber int    `json:"track_number"`
					ReleaseDate string `json:"release_date"`
				} `json:"track"`
			}
			if jsonData, jsonErr := json.Marshal(trackData); jsonErr == nil {
				if json.Unmarshal(jsonData, &trackResp) == nil {
					if req.Copyright == "" && trackResp.Track.Copyright != "" {
						req.Copyright = trackResp.Track.Copyright
					}
					if req.Publisher == "" && trackResp.Track.Publisher != "" {
						req.Publisher = trackResp.Track.Publisher
					}
					if req.SpotifyTotalDiscs == 0 && trackResp.Track.TotalDiscs > 0 {
						req.SpotifyTotalDiscs = trackResp.Track.TotalDiscs
					}
					if req.SpotifyTotalTracks == 0 && trackResp.Track.TotalTracks > 0 {
						req.SpotifyTotalTracks = trackResp.Track.TotalTracks
					}
					if req.SpotifyTrackNumber == 0 && trackResp.Track.TrackNumber > 0 {
						req.SpotifyTrackNumber = trackResp.Track.TrackNumber
					}
					if req.ReleaseDate == "" && trackResp.Track.ReleaseDate != "" {
						req.ReleaseDate = trackResp.Track.ReleaseDate
					}
				}
			}
		}
	}

	if req.TrackName != "" && req.ArtistName != "" {
		expectedFilename := backend.BuildExpectedFilename(req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.FilenameFormat, req.PlaylistName, req.PlaylistOwner, req.TrackNumber, req.Position, req.SpotifyDiscNumber, req.UseAlbumTrackNumber)
		expectedPath := filepath.Join(req.OutputDir, expectedFilename)

		if fileInfo, err := os.Stat(expectedPath); err == nil && fileInfo.Size() > 100*1024 {
			backend.SkipDownloadItem(itemID, expectedPath)
			return DownloadResponse{
				Success:       true,
				Message:       "File already exists",
				File:          expectedPath,
				AlreadyExists: true,
				ItemID:        itemID,
			}, nil
		}
	}

	lyricsChan := make(chan string, 1)
	isrcChan := make(chan string, 1)

	if req.SpotifyID != "" {
		if req.EmbedLyrics {
			go func() {
				client := backend.NewLyricsClient()
				resp, _, err := client.FetchLyricsAllSources(req.SpotifyID, req.TrackName, req.ArtistName, req.Duration)
				if err == nil && resp != nil && len(resp.Lines) > 0 {
					lrc := client.ConvertToLRC(resp, req.TrackName, req.ArtistName)
					lyricsChan <- lrc
				} else {
					lyricsChan <- ""
				}
			}()
		} else {
			close(lyricsChan)
		}

		go func() {
			client := backend.NewSongLinkClient()
			isrc, _ := client.GetISRC(req.SpotifyID)
			isrcChan <- isrc
		}()
	} else {
		close(lyricsChan)
		close(isrcChan)
	}

	switch req.Service {
	case "amazon":
		downloader := backend.NewAmazonDownloader()
		if req.ServiceURL != "" {
			filename, err = downloader.DownloadByURL(req.ServiceURL, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.PlaylistName, req.PlaylistOwner, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.CoverURL, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.EmbedMaxQualityCover, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.UseFirstArtistOnly)
		} else {
			filename, err = downloader.DownloadBySpotifyID(req.SpotifyID, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.PlaylistName, req.PlaylistOwner, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.CoverURL, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.EmbedMaxQualityCover, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.UseFirstArtistOnly)
		}
	case "tidal":
		if req.ApiURL == "" || req.ApiURL == "auto" {
			downloader := backend.NewTidalDownloader("")
			if req.ServiceURL != "" {
				filename, err = downloader.DownloadByURLWithFallback(req.ServiceURL, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.UseAlbumTrackNumber, req.CoverURL, req.EmbedMaxQualityCover, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.AllowFallback, req.UseFirstArtistOnly)
			} else {
				filename, err = downloader.Download(req.SpotifyID, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.UseAlbumTrackNumber, req.CoverURL, req.EmbedMaxQualityCover, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.AllowFallback, req.UseFirstArtistOnly)
			}
		} else {
			downloader := backend.NewTidalDownloader(req.ApiURL)
			if req.ServiceURL != "" {
				filename, err = downloader.DownloadByURL(req.ServiceURL, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.UseAlbumTrackNumber, req.CoverURL, req.EmbedMaxQualityCover, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.AllowFallback, req.UseFirstArtistOnly)
			} else {
				filename, err = downloader.Download(req.SpotifyID, req.OutputDir, req.AudioFormat, req.FilenameFormat, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.UseAlbumTrackNumber, req.CoverURL, req.EmbedMaxQualityCover, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.AllowFallback, req.UseFirstArtistOnly)
			}
		}
	case "qobuz":
		isrc := <-isrcChan
		downloader := backend.NewQobuzDownloader()
		quality := req.AudioFormat
		if quality == "" {
			quality = "6"
		}
		filename, err = downloader.DownloadTrackWithISRC(isrc, req.SpotifyID, req.OutputDir, quality, req.FilenameFormat, req.TrackNumber, req.Position, req.TrackName, req.ArtistName, req.AlbumName, req.AlbumArtist, req.ReleaseDate, req.UseAlbumTrackNumber, req.CoverURL, req.EmbedMaxQualityCover, req.SpotifyTrackNumber, req.SpotifyDiscNumber, req.SpotifyTotalTracks, req.SpotifyTotalDiscs, req.Copyright, req.Publisher, spotifyURL, req.AllowFallback, req.UseFirstArtistOnly)
	default:
		return DownloadResponse{Success: false, Error: fmt.Sprintf("Unknown service: %s", req.Service)}, fmt.Errorf("unknown service: %s", req.Service)
	}

	if err != nil {
		backend.FailDownloadItem(itemID, fmt.Sprintf("Download failed: %v", err))
		if filename != "" && !strings.HasPrefix(filename, "EXISTS:") {
			if _, statErr := os.Stat(filename); statErr == nil {
				os.Remove(filename)
			}
		}
		return DownloadResponse{Success: false, Error: fmt.Sprintf("Download failed: %v", err), ItemID: itemID}, err
	}

	alreadyExists := false
	if strings.HasPrefix(filename, "EXISTS:") {
		alreadyExists = true
		filename = strings.TrimPrefix(filename, "EXISTS:")
	}

	if !alreadyExists && req.SpotifyID != "" && req.EmbedLyrics && (strings.HasSuffix(filename, ".flac") || strings.HasSuffix(filename, ".mp3") || strings.HasSuffix(filename, ".m4a")) {
		lyrics := <-lyricsChan
		if lyrics != "" {
			backend.EmbedLyricsOnlyUniversal(filename, lyrics)
		}
	} else {
		select {
		case <-lyricsChan:
		default:
		}
	}

	message := "Download completed successfully"
	if alreadyExists {
		message = "File already exists"
		backend.SkipDownloadItem(itemID, filename)
	} else {
		if fileInfo, statErr := os.Stat(filename); statErr == nil {
			finalSize := float64(fileInfo.Size()) / (1024 * 1024)
			backend.CompleteDownloadItem(itemID, filename, finalSize)
		} else {
			backend.CompleteDownloadItem(itemID, filename, 0)
		}

		go func(fPath, track, artist, album, sID, cover, format string) {
			quality := "Unknown"
			durationStr := "--:--"
			meta, err := backend.GetTrackMetadata(fPath)
			if err == nil && meta != nil {
				quality = fmt.Sprintf("%d-bit/%.1fkHz", meta.BitsPerSample, float64(meta.SampleRate)/1000.0)
				d := int(meta.Duration)
				durationStr = fmt.Sprintf("%d:%02d", d/60, d%60)
			}
			item := backend.HistoryItem{
				SpotifyID:   sID,
				Title:       track,
				Artists:     artist,
				Album:       album,
				DurationStr: durationStr,
				CoverURL:    cover,
				Quality:     quality,
				Format:      format,
				Path:        fPath,
			}
			if item.Format == "" || item.Format == "LOSSLESS" {
				ext := filepath.Ext(fPath)
				if len(ext) > 1 {
					item.Format = strings.ToUpper(ext[1:])
				}
			}
			switch item.Format {
			case "6", "7", "27":
				item.Format = "FLAC"
			}
			backend.AddHistoryItem(item, "Silly")
		}(filename, req.TrackName, req.ArtistName, req.AlbumName, req.SpotifyID, req.CoverURL, req.AudioFormat)
	}

	return DownloadResponse{
		Success:       true,
		Message:       message,
		File:          filename,
		AlreadyExists: alreadyExists,
		ItemID:        itemID,
	}, nil
}

// System/Config Methods
func (a *App) GetDefaults() (map[string]string, error) {
	return map[string]string{"downloadPath": backend.GetDefaultMusicPath()}, nil
}

func (a *App) GetDownloadProgress() backend.ProgressInfo {
	return backend.GetDownloadProgress()
}

func (a *App) GetDownloadQueue() backend.DownloadQueueInfo {
	return backend.GetDownloadQueue()
}

func (a *App) ClearCompletedDownloads() (bool, error) {
	backend.ClearDownloadQueue()
	return true, nil
}

func (a *App) ClearAllDownloads() (bool, error) {
	backend.ClearAllDownloads()
	return true, nil
}

func (a *App) AddToDownloadQueue(req AddQueueReq) (string, error) {
	itemID := fmt.Sprintf("%s-%d", req.SpotifyID, time.Now().UnixNano())
	backend.AddToQueue(itemID, req.TrackName, req.ArtistName, req.AlbumName, "")
	return itemID, nil
}

func (a *App) MarkDownloadItemFailed(req MarkFailedReq) (bool, error) {
	backend.FailDownloadItem(req.ItemID, req.ErrorMsg)
	return true, nil
}

func (a *App) CancelAllQueuedItems() (bool, error) {
	backend.CancelAllQueuedItems()
	return true, nil
}

type ExportFailedResponse struct {
	Content  string `json:"content"`
	Filename string `json:"filename"`
}

// Modified to return string directly for the browser to download
func (a *App) ExportFailedDownloads() (ExportFailedResponse, error) {
	queueInfo := backend.GetDownloadQueue()
	var failedItems []string

	hasFailed := false
	for _, item := range queueInfo.Queue {
		if item.Status == backend.StatusFailed {
			hasFailed = true
			break
		}
	}

	if !hasFailed {
		return ExportFailedResponse{}, fmt.Errorf("No failed downloads to export")
	}

	failedItems = append(failedItems, fmt.Sprintf("Failed Downloads Report - %s", time.Now().Format("2006-01-02 15:04:05")))
	failedItems = append(failedItems, strings.Repeat("-", 50))
	failedItems = append(failedItems, "")

	count := 0
	for _, item := range queueInfo.Queue {
		if item.Status == backend.StatusFailed {
			count++
			line := fmt.Sprintf("%d. %s - %s", count, item.TrackName, item.ArtistName)
			if item.AlbumName != "" {
				line += fmt.Sprintf(" (%s)", item.AlbumName)
			}
			failedItems = append(failedItems, line)
			failedItems = append(failedItems, fmt.Sprintf("   Error: %s", item.ErrorMessage))
			if item.SpotifyID != "" {
				failedItems = append(failedItems, fmt.Sprintf("   ID: %s", item.SpotifyID))
				failedItems = append(failedItems, fmt.Sprintf("   URL: https://open.spotify.com/track/%s", item.SpotifyID))
			}
			failedItems = append(failedItems, "")
		}
	}

	content := strings.Join(failedItems, "\n")
	defaultFilename := fmt.Sprintf("Silly%s_Failed.txt", time.Now().Format("20060102_150405"))

	return ExportFailedResponse{
		Content:  content,
		Filename: defaultFilename,
	}, nil
}

func (a *App) GetDownloadHistory() ([]backend.HistoryItem, error) {
	return backend.GetHistoryItems("Silly")
}
func (a *App) ClearDownloadHistory() (bool, error) {
	return true, backend.ClearHistory("Silly")
}
func (a *App) DeleteDownloadHistoryItem(req IDReq) (bool, error) {
	return true, backend.DeleteHistoryItem(req.ID, "Silly")
}
func (a *App) GetFetchHistory() ([]backend.FetchHistoryItem, error) {
	return backend.GetFetchHistoryItems("Silly")
}
func (a *App) AddFetchHistory(item backend.FetchHistoryItem) (bool, error) {
	return true, backend.AddFetchHistoryItem(item, "Silly")
}
func (a *App) ClearFetchHistory() (bool, error) {
	return true, backend.ClearFetchHistory("Silly")
}
func (a *App) DeleteFetchHistoryItem(req IDReq) (bool, error) {
	return true, backend.DeleteFetchHistoryItem(req.ID, "Silly")
}
func (a *App) ClearFetchHistoryByType(req struct{ ItemType string `json:"item_type"` }) (bool, error) {
	return true, backend.ClearFetchHistoryByType(req.ItemType, "Silly")
}

func (a *App) AnalyzeTrack(req AnalyzeTrackReq) (*backend.AnalysisResult, error) {
	if req.FilePath == "" {
		return nil, fmt.Errorf("file path is required")
	}
	return backend.AnalyzeTrack(req.FilePath)
}

func (a *App) AnalyzeMultipleTracks(req FilesReq) ([]*backend.AnalysisResult, error) {
	if len(req.FilePaths) == 0 {
		return nil, fmt.Errorf("at least one file path is required")
	}
	results := make([]*backend.AnalysisResult, 0, len(req.FilePaths))
	for _, filePath := range req.FilePaths {
		result, err := backend.AnalyzeTrack(filePath)
		if err == nil {
			results = append(results, result)
		}
	}
	return results, nil
}

func (a *App) DownloadLyrics(req backend.LyricsDownloadRequest) (*backend.LyricsDownloadResponse, error) {
	if req.SpotifyID == "" {
		return nil, fmt.Errorf("spotify ID is required")
	}
	client := backend.NewLyricsClient()
	backendReq := backend.LyricsDownloadRequest{
		SpotifyID:           req.SpotifyID,
		TrackName:           req.TrackName,
		ArtistName:          req.ArtistName,
		AlbumName:           req.AlbumName,
		AlbumArtist:         req.AlbumArtist,
		ReleaseDate:         req.ReleaseDate,
		OutputDir:           req.OutputDir,
		FilenameFormat:      req.FilenameFormat,
		TrackNumber:         req.TrackNumber,
		Position:            req.Position,
		UseAlbumTrackNumber: req.UseAlbumTrackNumber,
		DiscNumber:          req.DiscNumber,
	}
	return client.DownloadLyrics(backendReq)
}

func (a *App) DownloadCover(req backend.CoverDownloadRequest) (*backend.CoverDownloadResponse, error) {
	if req.CoverURL == "" {
		return nil, fmt.Errorf("cover URL is required")
	}
	client := backend.NewCoverClient()
	backendReq := backend.CoverDownloadRequest{
		CoverURL:       req.CoverURL,
		TrackName:      req.TrackName,
		ArtistName:     req.ArtistName,
		AlbumName:      req.AlbumName,
		AlbumArtist:    req.AlbumArtist,
		ReleaseDate:    req.ReleaseDate,
		OutputDir:      req.OutputDir,
		FilenameFormat: req.FilenameFormat,
		TrackNumber:    req.TrackNumber,
		Position:       req.Position,
		DiscNumber:     req.DiscNumber,
	}
	return client.DownloadCover(backendReq)
}

type HeaderDownloadRequest struct {
	HeaderURL  string `json:"header_url"`
	ArtistName string `json:"artist_name"`
	OutputDir  string `json:"output_dir"`
}

func (a *App) DownloadHeader(req HeaderDownloadRequest) (*backend.HeaderDownloadResponse, error) {
	if req.HeaderURL == "" || req.ArtistName == "" {
		return nil, fmt.Errorf("missing parameters")
	}
	client := backend.NewCoverClient()
	return client.DownloadHeader(backend.HeaderDownloadRequest{
		HeaderURL:  req.HeaderURL,
		ArtistName: req.ArtistName,
		OutputDir:  req.OutputDir,
	})
}

type GalleryImageDownloadRequest struct {
	ImageURL   string `json:"image_url"`
	ArtistName string `json:"artist_name"`
	ImageIndex int    `json:"image_index"`
	OutputDir  string `json:"output_dir"`
}

func (a *App) DownloadGalleryImage(req GalleryImageDownloadRequest) (*backend.GalleryImageDownloadResponse, error) {
	if req.ImageURL == "" || req.ArtistName == "" {
		return nil, fmt.Errorf("missing parameters")
	}
	client := backend.NewCoverClient()
	return client.DownloadGalleryImage(backend.GalleryImageDownloadRequest{
		ImageURL:   req.ImageURL,
		ArtistName: req.ArtistName,
		ImageIndex: req.ImageIndex,
		OutputDir:  req.OutputDir,
	})
}

type AvatarDownloadRequest struct {
	AvatarURL  string `json:"avatar_url"`
	ArtistName string `json:"artist_name"`
	OutputDir  string `json:"output_dir"`
}

func (a *App) DownloadAvatar(req AvatarDownloadRequest) (*backend.AvatarDownloadResponse, error) {
	if req.AvatarURL == "" || req.ArtistName == "" {
		return nil, fmt.Errorf("missing parameters")
	}
	client := backend.NewCoverClient()
	return client.DownloadAvatar(backend.AvatarDownloadRequest{
		AvatarURL:  req.AvatarURL,
		ArtistName: req.ArtistName,
		OutputDir:  req.OutputDir,
	})
}

func (a *App) CheckTrackAvailability(req AvailabilityReq) (interface{}, error) {
	if req.SpotifyTrackID == "" {
		return nil, fmt.Errorf("spotify track ID is required")
	}
	client := backend.NewSongLinkClient()
	return client.CheckTrackAvailability(req.SpotifyTrackID)
}

func (a *App) IsFFmpegInstalled() (bool, error) {
	return backend.IsFFmpegInstalled()
}
func (a *App) IsFFprobeInstalled() (bool, error) {
	return backend.IsFFprobeInstalled()
}
func (a *App) GetFFmpegPath() (string, error) {
	return backend.GetFFmpegPath()
}

type DownloadFFmpegResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

func (a *App) DownloadFFmpeg() DownloadFFmpegResponse {
	// Note: Removed Wails events. Progress updates require SSE in web apps.
	err := backend.DownloadFFmpeg(func(progress int) {})
	if err != nil {
		return DownloadFFmpegResponse{Success: false, Error: err.Error()}
	}
	return DownloadFFmpegResponse{Success: true, Message: "FFmpeg installed successfully"}
}

type ConvertAudioRequest struct {
	InputFiles   []string `json:"input_files"`
	OutputFormat string   `json:"output_format"`
	Bitrate      string   `json:"bitrate"`
	Codec        string   `json:"codec"`
}

func (a *App) ConvertAudio(req ConvertAudioRequest) ([]backend.ConvertAudioResult, error) {
	return backend.ConvertAudio(backend.ConvertAudioRequest{
		InputFiles:   req.InputFiles,
		OutputFormat: req.OutputFormat,
		Bitrate:      req.Bitrate,
		Codec:        req.Codec,
	})
}

func (a *App) GetFileSizes(req FilesReq) (map[string]int64, error) {
	return backend.GetFileSizes(req.FilePaths), nil
}

func (a *App) ListDirectoryFiles(req DirReq) ([]backend.FileInfo, error) {
	return backend.ListDirectory(req.DirPath)
}

func (a *App) ListAudioFilesInDir(req DirReq) ([]backend.FileInfo, error) {
	return backend.ListAudioFiles(req.DirPath)
}

func (a *App) ReadFileMetadata(req FileReq) (*backend.AudioMetadata, error) {
	return backend.ReadAudioMetadata(req.FilePath)
}

func (a *App) PreviewRenameFiles(req RenameReq) ([]backend.RenamePreview, error) {
	return backend.PreviewRename(req.Files, req.Format), nil
}

func (a *App) RenameFilesByMetadata(req RenameReq) ([]backend.RenameResult, error) {
	return backend.RenameFiles(req.Files, req.Format), nil
}

func (a *App) ReadTextFile(req FileReq) (string, error) {
	content, err := os.ReadFile(req.FilePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (a *App) RenameFileTo(req RenameFileReq) (bool, error) {
	dir := filepath.Dir(req.OldPath)
	ext := filepath.Ext(req.OldPath)
	newPath := filepath.Join(dir, req.NewName+ext)
	return true, os.Rename(req.OldPath, newPath)
}

func (a *App) UploadImage(req FileReq) (string, error) {
	return backend.UploadToSendNow(req.FilePath)
}

func (a *App) UploadImageBytes(req UploadBytesReq) (string, error) {
	base64Data := req.Base64Data
	if idx := strings.Index(base64Data, ","); idx != -1 {
		base64Data = base64Data[idx+1:]
	}
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %v", err)
	}
	return backend.UploadBytesToSendNow(req.Filename, data)
}

func (a *App) ReadImageAsBase64(req FileReq) (string, error) {
	content, err := os.ReadFile(req.FilePath)
	if err != nil {
		return "", err
	}
	ext := strings.ToLower(filepath.Ext(req.FilePath))
	var mimeType string
	switch ext {
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".png":
		mimeType = "image/png"
	case ".gif":
		mimeType = "image/gif"
	case ".webp":
		mimeType = "image/webp"
	default:
		mimeType = "image/jpeg"
	}
	encoded := base64.StdEncoding.EncodeToString(content)
	return fmt.Sprintf("data:%s;base64,%s", mimeType, encoded), nil
}

type CheckFileExistenceRequest struct {
	SpotifyID           string `json:"spotify_id"`
	TrackName           string `json:"track_name"`
	ArtistName          string `json:"artist_name"`
	AlbumName           string `json:"album_name,omitempty"`
	AlbumArtist         string `json:"album_artist,omitempty"`
	ReleaseDate         string `json:"release_date,omitempty"`
	TrackNumber         int    `json:"track_number,omitempty"`
	DiscNumber          int    `json:"disc_number,omitempty"`
	Position            int    `json:"position,omitempty"`
	UseAlbumTrackNumber bool   `json:"use_album_track_number,omitempty"`
	FilenameFormat      string `json:"filename_format,omitempty"`
	IncludeTrackNumber  bool   `json:"include_track_number,omitempty"`
	AudioFormat         string `json:"audio_format,omitempty"`
	RelativePath        string `json:"relative_path,omitempty"`
}

type CheckFileExistenceResult struct {
	SpotifyID  string `json:"spotify_id"`
	Exists     bool   `json:"exists"`
	FilePath   string `json:"file_path,omitempty"`
	TrackName  string `json:"track_name,omitempty"`
	ArtistName string `json:"artist_name,omitempty"`
}

func (a *App) CheckFilesExistence(req CheckExistenceReq) ([]CheckFileExistenceResult, error) {
	tracks := req.Tracks
	outputDir := req.OutputDir
	rootDir := req.RootDir

	if len(tracks) == 0 {
		return []CheckFileExistenceResult{}, nil
	}
	outputDir = backend.NormalizePath(outputDir)
	if rootDir != "" {
		rootDir = backend.NormalizePath(rootDir)
	}

	defaultFilenameFormat := "title-artist"
	type result struct {
		index  int
		result CheckFileExistenceResult
	}
	resultsChan := make(chan result, len(tracks))

	var rootDirFiles map[string]string
	rootDirFilesOnce := false
	getRootDirFiles := func() map[string]string {
		if rootDirFilesOnce {
			return rootDirFiles
		}
		rootDirFiles = make(map[string]string)
		if rootDir != "" && rootDir != outputDir {
			filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return nil
				}
				if !info.IsDir() {
					if strings.EqualFold(filepath.Ext(path), ".flac") || strings.EqualFold(filepath.Ext(path), ".mp3") {
						rootDirFiles[info.Name()] = path
					}
				}
				return nil
			})
		}
		rootDirFilesOnce = true
		return rootDirFiles
	}

	for i, track := range tracks {
		go func(idx int, t CheckFileExistenceRequest) {
			res := CheckFileExistenceResult{
				SpotifyID:  t.SpotifyID,
				TrackName:  t.TrackName,
				ArtistName: t.ArtistName,
				Exists:     false,
			}
			if t.TrackName == "" || t.ArtistName == "" {
				resultsChan <- result{index: idx, result: res}
				return
			}
			filenameFormat := t.FilenameFormat
			if filenameFormat == "" {
				filenameFormat = defaultFilenameFormat
			}
			trackNumber := t.Position
			if t.UseAlbumTrackNumber && t.TrackNumber > 0 {
				trackNumber = t.TrackNumber
			}
			fileExt := ".flac"
			if t.AudioFormat == "mp3" {
				fileExt = ".mp3"
			}
			expectedFilenameBase := backend.BuildExpectedFilename(
				t.TrackName, t.ArtistName, t.AlbumName, t.AlbumArtist, t.ReleaseDate,
				filenameFormat, "", "", t.IncludeTrackNumber, trackNumber,
				t.DiscNumber, t.UseAlbumTrackNumber,
			)
			expectedFilename := strings.TrimSuffix(expectedFilenameBase, ".flac") + fileExt
			targetDir := outputDir
			if t.RelativePath != "" {
				targetDir = filepath.Join(outputDir, t.RelativePath)
			}
			expectedPath := filepath.Join(targetDir, expectedFilename)

			if fileInfo, err := os.Stat(expectedPath); err == nil && fileInfo.Size() > 100*1024 {
				res.Exists = true
				res.FilePath = expectedPath
			} else {
				res.FilePath = expectedFilename
			}
			resultsChan <- result{index: idx, result: res}
		}(i, track)
	}

	results := make([]CheckFileExistenceResult, len(tracks))
	missingIndices := []int{}

	for i := 0; i < len(tracks); i++ {
		r := <-resultsChan
		results[r.index] = r.result
		if !results[r.index].Exists {
			missingIndices = append(missingIndices, r.index)
		}
	}

	if len(missingIndices) > 0 && rootDir != "" {
		filesMap := getRootDirFiles()
		if len(filesMap) > 0 {
			for _, idx := range missingIndices {
				expectedFilename := results[idx].FilePath
				baseName := filepath.Base(expectedFilename)
				if path, ok := filesMap[baseName]; ok {
					results[idx].Exists = true
					results[idx].FilePath = path
				} else {
					results[idx].FilePath = ""
				}
			}
		} else {
			for _, idx := range missingIndices {
				results[idx].FilePath = ""
			}
		}
	} else {
		for _, idx := range missingIndices {
			results[idx].FilePath = ""
		}
	}
	return results, nil
}

func (a *App) SkipDownloadItem(req SkipReq) (bool, error) {
	backend.SkipDownloadItem(req.ItemID, req.FilePath)
	return true, nil
}

func (a *App) GetPreviewURL(req TrackReq) (string, error) {
	return backend.GetPreviewURL(req.TrackID)
}

func (a *App) GetConfigPath() (string, error) {
	dir, err := backend.GetFFmpegDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

func (a *App) SaveSettings(req SaveSettingsReq) (bool, error) {
	configPath, err := a.GetConfigPath()
	if err != nil {
		return false, err
	}
	dir := filepath.Dir(configPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return false, err
		}
	}
	data, err := json.MarshalIndent(req.Settings, "", "  ")
	if err != nil {
		return false, err
	}
	return true, os.WriteFile(configPath, data, 0644)
}

func (a *App) LoadSettings() (map[string]interface{}, error) {
	configPath, err := a.GetConfigPath()
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, nil
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}
	var settings map[string]interface{}
	if err := json.Unmarshal(data, &settings); err != nil {
		return nil, err
	}
	return settings, nil
}

func (a *App) CheckFFmpegInstalled() (bool, error) {
	return backend.IsFFmpegInstalled()
}

func (a *App) GetOSInfo() (string, error) {
	return backend.GetOSInfo()
}

func (a *App) CreateM3U8File(req CreateM3U8Req) (bool, error) {
	filePaths := req.FilePaths
	outputDir := req.OutputDir
	m3u8Name := req.M3U8Name

	if len(filePaths) == 0 {
		return true, nil
	}
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return false, err
	}
	safeName := backend.SanitizeFilename(m3u8Name)
	if safeName == "" {
		safeName = "playlist"
	}
	m3u8Path := filepath.Join(outputDir, safeName+".m3u8")
	f, err := os.Create(m3u8Path)
	if err != nil {
		return false, err
	}
	defer f.Close()

	if _, err := f.WriteString("#EXTM3U\n"); err != nil {
		return false, err
	}
	for _, path := range filePaths {
		if path == "" {
			continue
		}
		relPath, err := filepath.Rel(outputDir, path)
		if err != nil {
			relPath = path
		}
		relPath = filepath.ToSlash(relPath)
		if _, err := f.WriteString(relPath + "\n"); err != nil {
			return false, err
		}
	}
	return true, nil
}

type VoidReq struct{}

func (a *App) GetUserHomeDir(req VoidReq) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return os.Getwd()
	}
	return home, nil
}

func (a *App) GetPathSeparator(req VoidReq) (string, error) {
	return string(filepath.Separator), nil
}
