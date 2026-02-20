import { useState, useEffect } from "react";
import { app } from "@/lib/rpc";
import { backend } from "@/types/models";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, ChevronRight, HardDrive, ArrowUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ServerFolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  title?: string;
}

export function ServerFolderBrowser({ isOpen, onClose, onSelectFolder, title = "Select Server Folder" }: ServerFolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [separator, setSeparator] = useState("/");
  const [folders, setFolders] = useState<backend.FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize starting path
  useEffect(() => {
    if (isOpen) {
      initBrowser();
    }
  }, [isOpen]);

  const initBrowser = async () => {
    try {
      const sep = await app.GetPathSeparator();
      setSeparator(sep);
      
      const home = await app.GetUserHomeDir();
      setCurrentPath(home);
      await loadDirectory(home);
    } catch (err) {
      console.error("Failed to init file browser", err);
    }
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const items = await app.ListDirectoryFiles(path);
      // We only want folders for a folder selector
      const dirOnly  = (items || []).filter(item => item.is_dir).sort((a, b) => a.name.localeCompare(b.name));
      setFolders(dirOnly);
      setCurrentPath(path);
    } catch (err) {
      console.error(`Failed to load directory ${path}`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoUp = () => {
    // Basic string manipulation to go up a directory
    const parts = currentPath.split(separator).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const newPath = currentPath.startsWith(separator) 
        ? separator + parts.join(separator) // Linux/Mac
        : parts.join(separator) + separator; // Windows (e.g. C:\)
      loadDirectory(newPath);
    } else if (parts.length === 1 && currentPath.includes(":")) {
      // Windows root edge case (going up from C:\ folder to C:\)
      loadDirectory(parts[0] + separator);
    }
  };

  const handleSelect = () => {
    onSelectFolder(currentPath);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Path Navigation Bar */}
          <div className="flex items-center gap-2 bg-muted p-2 rounded-md border text-sm overflow-x-auto whitespace-nowrap">
            <HardDrive className="w-4 h-4 shrink-0 text-muted-foreground" />
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="font-mono">{currentPath}</span>
          </div>

          {/* Folder List */}
          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="flex flex-col gap-1">
              {/* Go Up Button */}
              <Button 
                variant="ghost" 
                className="justify-start px-2 py-1.5 h-auto text-muted-foreground" 
                onClick={handleGoUp}
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                ..
              </Button>

              {/* Folder Items */}
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : folders.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No folders found</div>
              ) : (
                folders.map((folder, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    className="justify-start px-2 py-1.5 h-auto font-normal"
                    onClick={() => loadDirectory(folder.path)}
                  >
                    <Folder className="w-4 h-4 mr-2 text-blue-400 fill-blue-400/20" />
                    {folder.name}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSelect}>Select This Folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
