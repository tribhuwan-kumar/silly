import { useState, useEffect } from "react";
import { app } from "@/lib/rpc";
import { backend } from "@/types/models";
import { Button } from "@/components/ui/button";
import { InputWithContext } from "@/components/ui/input-with-context";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastWithSound as toast } from "@/lib/toast-with-sound";
import { Trash2, Plus, Clock, RefreshCw, Settings2 } from "lucide-react";

export function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<backend.WatchedPlaylist[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newInterval, setNewInterval] = useState("12");

  const loadWatchlists = async () => {
    setLoading(true);
    try {
      const lists = await app.GetWatchlists();
      setWatchlists(lists || []);
    } catch (err) {
      toast.error(`Failed to load watchlists: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
    const interval = setInterval(loadWatchlists, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async () => {
    if (!newUrl || !newName) {
      toast.error("Please fill all fields");
      return;
    }

    const match = newUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    const spotifyId = match ? match[1] : "unknown";

    try {
      await app.AddToWatchlist({
        spotify_id: spotifyId,
        url: newUrl,
        name: newName,
        interval_hours: parseInt(newInterval, 10),
      });
      toast.success("Playlist added to Watchlist");
      setIsAddModalOpen(false);
      setNewUrl(""); setNewName("");
      loadWatchlists();
    } catch (err) {
      toast.error(`Failed to load watchlists: ${err}`);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await app.RemoveFromWatchlist(id);
      toast.success("Removed from Watchlist");
      loadWatchlists();
    } catch (err) {
      toast.error(`Failed to load watchlists: ${err}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auto-Sync Playlists</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadWatchlists} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Playlist
          </Button>
        </div>
      </div>

      {watchlists.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-md flex items-center gap-3 text-sm text-primary">
          <Settings2 className="h-5 w-5 shrink-0" />
          <p>
            Songs found during Auto-Sync are downloaded using your global <strong>Settings</strong> (Destination Folder, Audio Quality, and Lyrics preferences).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {watchlists.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No playlists are currently being watched. Add one to start auto-syncing!
          </div>
        ) : (
          watchlists.map((list) => (
            <div key={list.id} className="p-4 border rounded-lg bg-card/50 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0 pr-4">
                  <h3 className="font-bold truncate" title={list.name}>{list.name}</h3>
                  <a href={list.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-1">
                    {list.url}
                  </a>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemove(list.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2 bg-background p-3 rounded border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Checks every {list.interval_hours}h
                </div>
                <div className="col-span-2 text-xs border-t pt-2 mt-1">
                  Last Checked: {list.last_checked === "0001-01-01T00:00:00Z" ? "Pending initial sync..." : new Date(list.last_checked).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-140">
          <DialogHeader>
            <DialogTitle>Watch a Spotify Playlist</DialogTitle>
            <DialogDescription>
              We will periodically check this playlist for new songs and download them automatically in the background.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Playlist URL</Label>
              <InputWithContext placeholder="https://open.spotify.com/playlist/..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custom Name</Label>
              <InputWithContext placeholder="My Weekly Discoveries" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check Interval</Label>
              <Select value={newInterval} onValueChange={setNewInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every 1 Hour</SelectItem>
                  <SelectItem value="6">Every 6 Hours</SelectItem>
                  <SelectItem value="12">Every 12 Hours</SelectItem>
                  <SelectItem value="24">Daily (24H)</SelectItem>
                  <SelectItem value="168">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Start Watching</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
