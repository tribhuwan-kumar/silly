import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  X,
  Folder,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileMusic,
  WandSparkles,
  Server,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { app } from "@/lib/rpc";
import { toastWithSound as toast } from "@/lib/toast-with-sound";
import { ServerFileBrowser } from "./ServerFileBrowser";

interface AudioFile {
  path: string;
  name: string;
  format: string;
  size: number;
  status: "pending" | "converting" | "success" | "error";
  error?: string;
  outputPath?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const BITRATE_OPTIONS = [
  { value: "320k", label: "320k" },
  { value: "256k", label: "256k" },
  { value: "192k", label: "192k" },
  { value: "128k", label: "128k" },
];

const M4A_CODEC_OPTIONS = [
  { value: "aac", label: "AAC" },
  { value: "alac", label: "ALAC" },
];

const STORAGE_KEY = "silly_audio_converter_state";

export function AudioConverterPage() {
  const [files, setFiles] = useState<AudioFile[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
          return parsed.files;
        }
      }
    } catch (err) {
      console.error("Failed to load saved state:", err);
    }
    return [];
  });

  const convertableCount = files.filter(
    (f) => f.status === "pending" || f.status === "success",
  ).length;

  const successCount = files.filter((f) => f.status === "success").length;

  const [outputFormat, setOutputFormat] = useState<"mp3" | "m4a">(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.outputFormat === "mp3" || parsed.outputFormat === "m4a") {
          return parsed.outputFormat;
        }
      }
    } catch (err) {
      console.error(err)
    }
    return "mp3";
  });

  const [bitrate, setBitrate] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bitrate) return parsed.bitrate;
      }
    } catch (err) {
      console.error(err)
    }
    return "320k";
  });

  const [m4aCodec, setM4aCodec] = useState<"aac" | "alac">(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.m4aCodec === "aac" || parsed.m4aCodec === "alac") {
          return parsed.m4aCodec;
        }
      }
    } catch (err) {
      console.error(err)
    }
    return "aac";
  });

  const [converting, setConverting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);

  const saveState = useCallback(
    (stateToSave: {
      files: AudioFile[];
      outputFormat: "mp3" | "m4a";
      bitrate: string;
      m4aCodec: "aac" | "alac";
    }) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Failed to save state:", err);
      }
    },
    [],
  );

  useEffect(() => {
    saveState({ files, outputFormat, bitrate, m4aCodec });
  }, [files, outputFormat, bitrate, m4aCodec, saveState]);

  useEffect(() => {
    if (files.length === 0) return;
    const allMP3 = files.every((f) => f.format === "mp3");
    if (allMP3 && outputFormat !== "m4a") {
      setOutputFormat("m4a");
    }
    const hasFlac = files.some((f) => f.format === "flac");
    if (!hasFlac && m4aCodec === "alac") {
      setM4aCodec("aac");
    }
  }, [files, outputFormat, m4aCodec]);

  const isFormatDisabled = files.length > 0 && files.every((f) => f.format === "mp3");
  const hasFlacFiles = files.some((f) => f.format === "flac");

  useEffect(() => {
    const checkFullscreen = () => {
      const isMaximized = window.innerHeight >= window.screen.height * 0.9;
      setIsFullscreen(isMaximized);
    };
    checkFullscreen();
    window.addEventListener("resize", checkFullscreen);
    return () => window.removeEventListener("resize", checkFullscreen);
  }, []);

  const addFiles = useCallback(async (paths: string[]) => {
    const validExtensions = [".mp3", ".flac"];
    
    // Check for unsupported files quickly
    const m4aFiles = paths.filter((path) => path.toLowerCase().endsWith(".m4a"));
    if (m4aFiles.length > 0) {
      toast.error("M4A files not supported", {
        description: "Only FLAC and MP3 files are supported as input.",
      });
    }

    const validPaths = paths.filter((path) => {
      const ext = path.toLowerCase().slice(path.lastIndexOf("."));
      return validExtensions.includes(ext);
    });

    const fileSizes = validPaths.length > 0 ? await app.GetFileSizes(validPaths) : {};
    
    setFiles((prev) => {
      const newFiles: AudioFile[] = validPaths
        .filter((path) => !prev.some((f) => f.path === path))
        .map((path) => {
          const name = path.split(/[/\\]/).pop() || path;
          const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
          return {
            path,
            name,
            format: ext,
            size: fileSizes[path] || 0,
            status: "pending" as const,
          };
        });
        
      if (newFiles.length > 0) {
        if (paths.length > newFiles.length) {
          const skipped = paths.length - newFiles.length;
          toast.info("Some files skipped", {
            description: `${skipped} file(s) skipped (unsupported or already added)`,
          });
        }
        return [...prev, ...newFiles];
      }
      
      if (paths.length > 0 && m4aFiles.length === 0) {
        toast.info("No new files added", {
          description: "All selected files were already in the queue.",
        });
      }
      return prev;
    });
  }, []);

  const removeFile = (path: string) => setFiles((prev) => prev.filter((f) => f.path !== path));
  const clearFiles = () => setFiles([]);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setConverting(true);
    try {
      const inputPaths = files.map((f) => f.path);
      setFiles((prev) => prev.map((f) => inputPaths.includes(f.path) ? { ...f, status: "converting", error: undefined } : f));
      
      // Use RPC wrapper
      const results = await app.ConvertAudio({
        input_files: inputPaths,
        output_format: outputFormat,
        bitrate: bitrate,
        codec: outputFormat === "m4a" ? m4aCodec : "",
      });

      setFiles((prev) => prev.map((f) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = results.find((r: any) => r.input_file.toLowerCase() === f.path.toLowerCase());
          if (result) {
            return {
              ...f,
              status: result.success ? "success" : "error",
              error: result.error,
              outputPath: result.output_file,
            };
          }
          return f;
        }),
      );
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const successCount = results.filter((r: any) => r.success).length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failCount = results.filter((r: any) => !r.success).length;
      
      if (successCount > 0) {
        toast.success("Conversion Complete", {
          description: `Successfully converted ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
        });
      } else if (failCount > 0) {
        toast.error("Conversion Failed", {
          description: `All ${failCount} file(s) failed to convert`,
        });
      }
    } catch (err) {
      toast.error("Conversion Error", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          error: "Conversion failed",
        })),
      );
    } finally {
      setConverting(false);
    }
  };

  const getStatusIcon = (status: AudioFile["status"]) => {
    switch (status) {
      case "converting": return <Spinner className="h-4 w-4 text-primary" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <FileMusic className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audio Converter</h1>
        {files.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFileBrowserOpen(true)}>
              <Server className="h-4 w-4 mr-2" /> Add More
            </Button>
            <Button variant="outline" size="sm" onClick={clearFiles} disabled={converting}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear All
            </Button>
          </div>
        )}
      </div>

      <div className={`flex flex-col border-2 border-dashed rounded-lg transition-all ${
          isFullscreen ? "flex-1 min-h-[400px]" : "h-[400px]"
        } border-muted-foreground/30`}
      >
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Browse the server's filesystem to select FLAC or MP3 files you've downloaded for conversion.
            </p>
            <Button onClick={() => setIsFileBrowserOpen(true)} size="lg">
              <Folder className="h-5 w-5 mr-2" /> Browse Server Files
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Supported formats: FLAC, MP3</p>
          </div>
        ) : (
          <div className="w-full h-full p-6 space-y-4 flex flex-col">
            <div className="space-y-2 pb-4 border-b shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Format:</Label>
                  <ToggleGroup type="single" variant="outline" value={outputFormat}
                    onValueChange={(value) => { if (value && !isFormatDisabled) setOutputFormat(value as "mp3" | "m4a"); }}
                    disabled={isFormatDisabled}
                  >
                    {!isFormatDisabled && <ToggleGroupItem value="mp3">MP3</ToggleGroupItem>}
                    <ToggleGroupItem value="m4a" disabled={isFormatDisabled}>M4A</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {outputFormat === "m4a" && hasFlacFiles && (
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Codec:</Label>
                    <ToggleGroup type="single" variant="outline" value={m4aCodec} onValueChange={(value) => { if (value) setM4aCodec(value as "aac" | "alac"); }}>
                      {M4A_CODEC_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                    </ToggleGroup>
                  </div>
                )}

                {!(outputFormat === "m4a" && m4aCodec === "alac") && (
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Bitrate:</Label>
                    <ToggleGroup type="single" variant="outline" value={bitrate} onValueChange={(value) => { if (value) setBitrate(value); }}>
                      {BITRATE_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                    </ToggleGroup>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between shrink-0 text-sm text-muted-foreground">
              {files.length} file(s) • {successCount} converted
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
              {files.map((file) => (
                <div key={file.path} className="flex items-center gap-3 rounded-lg border p-3">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    {file.error && <p className="truncate text-xs text-destructive">{file.error}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  <span className="text-xs uppercase text-muted-foreground">{file.format}</span>
                  {file.status !== "converting" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(file.path)} disabled={converting}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-4 border-t shrink-0">
              <Button onClick={handleConvert} disabled={converting || convertableCount === 0} size="lg">
                {converting ? (
                  <><Spinner className="h-4 w-4 mr-2" /> Converting...</>
                ) : (
                  <><WandSparkles className="h-4 w-4 mr-2" /> Convert {convertableCount > 0 ? `${convertableCount} File(s)` : ""}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Render the new server file browser dialog */}
      <ServerFileBrowser 
        isOpen={isFileBrowserOpen}
        onClose={() => setIsFileBrowserOpen(false)}
        onSelectFiles={addFiles}
      />
    </div>
  );
}
