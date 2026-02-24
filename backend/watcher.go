package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type WatchedPlaylist struct {
	ID            string    `json:"id"`
	SpotifyID     string    `json:"spotify_id"`
	URL           string    `json:"url"`
	Name          string    `json:"name"`
	IntervalHours int       `json:"interval_hours"`
	LastChecked   time.Time `json:"last_checked"`
	AddedAt       time.Time `json:"added_at"`
}

type FetchMetaFunc func(url string) (interface{}, error)

type DownloadTriggerFunc func(spotifyID, trackName, artistName, albumName, coverURL, playlistName string)

type WatcherManager struct {
	Mu            sync.RWMutex
	Playlists     map[string]*WatchedPlaylist
	ctx           context.Context
	cancel        context.CancelFunc
	fetchMetaFunc FetchMetaFunc
	triggerDlFunc DownloadTriggerFunc
}

var GlobalWatcher *WatcherManager

func InitWatcher(fetchMeta FetchMetaFunc, triggerDl DownloadTriggerFunc) error {
	ctx, cancel := context.WithCancel(context.Background())
	GlobalWatcher = &WatcherManager{
		Playlists:     make(map[string]*WatchedPlaylist),
		ctx:           ctx,
		cancel:        cancel,
		fetchMetaFunc: fetchMeta,
		triggerDlFunc: triggerDl,
	}

	GlobalWatcher.Load()
	go GlobalWatcher.StartDaemon()
	return nil
}

func (wm *WatcherManager) getConfigPath() string {
	dir, _ := GetFFmpegDir()
	return filepath.Join(dir, "config.json")
}

func (wm *WatcherManager) Load() {
	data, err := os.ReadFile(wm.getConfigPath())
	if err != nil {
		return
	}
	var config map[string]interface{}
	if err := json.Unmarshal(data, &config); err != nil {
		return
	}
	if wlData, ok := config["watchlists"]; ok {
		wlBytes, _ := json.Marshal(wlData)
		json.Unmarshal(wlBytes, &wm.Playlists)
	}
}

func (wm *WatcherManager) Save() {
	configPath := wm.getConfigPath()
	var config map[string]interface{}
	data, err := os.ReadFile(configPath)
	if err == nil {
		json.Unmarshal(data, &config)
	}
	if config == nil {
		config = make(map[string]interface{})
	}
	config["watchlists"] = wm.Playlists
	newData, _ := json.MarshalIndent(config, "", "  ")
	os.WriteFile(configPath, newData, 0644)
}

func (wm *WatcherManager) StartDaemon() {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()
	fmt.Println("[Watcher] Daemon started...")

	wm.CheckAllPlaylists()

	for {
		select {
		case <-wm.ctx.Done():
			fmt.Println("[Watcher] Daemon stopped.")
			return
		case <-ticker.C:
			wm.CheckAllPlaylists()
		}
	}
}

func (wm *WatcherManager) CheckAllPlaylists() {
	wm.Mu.RLock()
	var duePlaylists []*WatchedPlaylist
	for _, p := range wm.Playlists {
		if p.LastChecked.IsZero() || time.Since(p.LastChecked).Hours() >= float64(p.IntervalHours) {
			duePlaylists = append(duePlaylists, p)
		}
	}
	wm.Mu.RUnlock()

	for _, p := range duePlaylists {
		wm.SyncPlaylist(p)
	}
}

func (wm *WatcherManager) SyncPlaylist(p *WatchedPlaylist) {
	fmt.Printf("[Watcher] Syncing playlist: %s\n", p.Name)

	// Call app.GetSpotifyMetadata via the callback
	data, err := wm.fetchMetaFunc(p.URL)
	if err != nil {
		fmt.Printf("[Watcher] Failed to fetch playlist %s: %v\n", p.Name, err)
		return
	}

	// Convert the interface{} to a map to extract tracks
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		fmt.Println("[Watcher] Failed to marshal playlist data")
		return
	}

	var dataMap map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &dataMap); err != nil {
		fmt.Println("[Watcher] Failed to unmarshal playlist data")
		return
	}
	
	var trackList []interface{}
	if tl, ok := dataMap["track_list"].([]interface{}); ok {
		trackList = tl
	} else if tl, ok := dataMap["tracks"].([]interface{}); ok {
		trackList = tl
	} else {
		fmt.Println("[Watcher] No tracks found in playlist data")
		return
	}

	addedCount := 0
	for _, tInterface := range trackList {
		track, ok := tInterface.(map[string]interface{})
		if !ok {
			continue
		}

		spotifyID, _ := track["spotify_id"].(string)
		if spotifyID == "" {
			spotifyID, _ = track["id"].(string)
		}
		trackName, _ := track["name"].(string)

		var artistName string
		if artists, ok := track["artists"].(string); ok {
			artistName = artists
		} else if artistsList, ok := track["artists"].([]interface{}); ok && len(artistsList) > 0 {
			if firstArtist, ok := artistsList[0].(map[string]interface{}); ok {
				artistName, _ = firstArtist["name"].(string)
			}
		}

		albumName, _ := track["album_name"].(string)
		if albumName == "" {
			if albObj, ok := track["album"].(map[string]interface{}); ok {
				albumName, _ = albObj["name"].(string)
			}
		}

		var coverURL string
		if imgs, ok := track["images"].(string); ok {
			coverURL = imgs
		} else if cover, ok := track["cover_url"].(string); ok {
			coverURL = cover
		} else if albObj, ok := track["album"].(map[string]interface{}); ok {
			if imgsArr, ok := albObj["images"].([]interface{}); ok && len(imgsArr) > 0 {
				if imgObj, ok := imgsArr[0].(map[string]interface{}); ok {
					coverURL, _ = imgObj["url"].(string)
				}
			}
		}

		if spotifyID != "" && trackName != "" {
			wm.triggerDlFunc(spotifyID, trackName, artistName, albumName, coverURL, p.Name)
			addedCount++
		}
	}
	
	fmt.Printf("[Watcher] Sent %d tracks to queue.\n", addedCount)

	wm.Mu.Lock()
	p.LastChecked = time.Now()
	wm.Save()
	wm.Mu.Unlock()
}
