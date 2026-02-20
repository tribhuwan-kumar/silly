import { useState, useEffect } from "react";
import { backend } from "@/types/models";
import { app } from "@/lib/rpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, FileAudio, ChevronRight, HardDrive, ArrowUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface ServerFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (paths: string[]) => void;
  allowedExtensions?: string[];
}

export function ServerFileBrowser({ 
  isOpen, 
  onClose, 
  onSelectFiles, 
  allowedExtensions = [".mp3", ".flac"] 
}: ServerFileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [separator, setSeparator] = useState("/");
  const [items, setItems] = useState<backend.FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      initBrowser();
      setSelectedPaths(new Set()); // Clear selection on open
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
      const dirItems = await app.ListDirectoryFiles(path);
      
      // Filter out files that don't match allowed extensions (keep all folders)
      const filteredItems = (dirItems || []).filter(item => {
        if (item.is_dir) return true;
        const ext = item.name.slice(item.name.lastIndexOf(".")).toLowerCase();
        return allowedExtensions.includes(ext);
      });

      // Sort: Folders first, then files alphabetically
      filteredItems.sort((a, b) => {
        if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
        return a.is_dir ? -1 : 1;
      });

      setItems(filteredItems);
      setCurrentPath(path);
    } catch (err) {
      console.error(`Failed to load directory ${path}`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoUp = () => {
    const parts = currentPath.split(separator).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const newPath = currentPath.startsWith(separator) 
        ? separator + parts.join(separator)
        : parts.join(separator) + separator;
      loadDirectory(newPath);
    } else if (parts.length === 1 && currentPath.includes(":")) {
      loadDirectory(parts[0] + separator);
    }
  };

  const toggleSelection = (path: string) => {
    setSelectedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleSelect = () => {
    onSelectFiles(Array.from(selectedPaths));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Server Audio Files</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-md border text-sm overflow-x-auto whitespace-nowrap">
            <HardDrive className="w-4 h-4 shrink-0 text-muted-foreground" />
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="font-mono">{currentPath}</span>
          </div>

          <ScrollArea className="h-[350px] border rounded-md p-2">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" className="justify-start px-2 py-1.5 h-auto text-muted-foreground" onClick={handleGoUp}>
                <ArrowUp className="w-4 h-4 mr-2" /> ..
              </Button>

              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No supported files found</div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex items-center hover:bg-muted/50 rounded-md px-2 py-1">
                    {item.is_dir ? (
                      <Button variant="ghost" className="flex-1 justify-start h-auto py-1.5 font-normal px-0" onClick={() => loadDirectory(item.path)}>
                        <Folder className="w-4 h-4 mr-2 text-blue-400 fill-blue-400/20" />
                        {item.name}
                      </Button>
                    ) : (
                      <div className="flex flex-1 items-center gap-3 py-1.5">
                        <Checkbox 
                          id={`file-${idx}`} 
                          checked={selectedPaths.has(item.path)}
                          onCheckedChange={() => toggleSelection(item.path)}
                        />
                        <label htmlFor={`file-${idx}`} className="flex items-center gap-2 flex-1 cursor-pointer font-normal text-sm">
                          <FileAudio className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{item.name}</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="text-sm text-muted-foreground">
            {selectedPaths.size} file(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSelect} disabled={selectedPaths.size === 0}>
            Add to Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
