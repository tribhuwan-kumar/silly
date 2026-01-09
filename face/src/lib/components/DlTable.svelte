<script lang="ts">
  import { toast } from "svelte-sonner";
  import { onMount, onDestroy } from 'svelte';
  import { buttonVariants } from "$lib/components/ui/button";
  import type { ItemMetaData, HistoryResponse, WsMessage, GlobalStat } from '$lib/aria2/types';

  import * as Table from "$lib/components/ui/table";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Badge } from "$lib/components/ui/badge";
  import { 
    EllipsisVertical, RefreshCcw, Trash2, FolderOpen,
    LoaderCircle, ChevronLeft, ChevronRight, Download, Upload, Activity
  } from '@lucide/svelte';

  // State
  let loading = false;
  let deleteWithFile = false;
  let history: ItemMetaData[] = [];
  let selectedGids: string[] = [];
  let ws: WebSocket | null = null;
  
  // Global Stats
  let globalStats: GlobalStat = { 
      downloadSpeed: "0", uploadSpeed: "0", numActive: "0", numWaiting: "0", numStopped: "0" 
  };

  // Pagination
  let currentPage = 1;
  let totalPages = 1;
  let totalItems = 0;
  const LIMIT = 15;

  // --- 1. Initial Load (HTTP) ---
  async function refresh(page = 1) {
    loading = true;
    try {
        const res = await fetch(`/api/auth/user/dl/history?page=${page}&limit=${LIMIT}`);
        const json: HistoryResponse = await res.json();
        history = json.data || [];
        console.log("from `get_history`", history)
        if (json.meta) {
            currentPage = json.meta.currentPage;
            totalPages = json.meta.totalPages;
            totalItems = json.meta.totalItems;
        }
        selectedGids = []; 
    } catch(e) {
        console.error(e);
        toast.error("Failed to load history");
    } finally {
        loading = false;
    }
  }

  // --- 2. WebSocket Logic ---
  function connectWs() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/dl/history`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        console.log("ws ddls", msg)
        if (msg.type === 'tick') {
            handleTick(msg);
        } else if (msg.type === 'event') {
            handleEvent(msg.data);
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onclose = () => console.log("History ws closed");
  }

  // Handle "1-Second Pulse" (Speed & Progress)
  function handleTick(msg: { global: GlobalStat, tasks: any[] }) {
      globalStats = msg.global;

      // Update active tasks in place
      for (const task of msg.tasks) {
          const index = history.findIndex(h => h.gid === task.gid);
          if (index !== -1) {
              // Merge updates into existing object
              history[index] = {
                  ...history[index],
                  status: task.status, // e.g. 'active'
                  totalLength: task.totalLength,
                  completedLength: task.completedLength,
                  uploadedLength: task.uploadedLength,
                  // Inject transient speed fields
                  downloadSpeed: task.downloadSpeed, 
                  uploadSpeed: task.uploadSpeed
              };
          }
      }
  }

  // Handle "Status Change" (Start, Stop, Error)
  function handleEvent(item: ItemMetaData) {
      const index = history.findIndex(h => h.gid === item.gid);
      if (index !== -1) {
          // Update status immediately (e.g. active -> complete)
          history[index] = { ...history[index], ...item };
      } else if (currentPage === 1) {
          // New download started, add to top
          history = [item, ...history];
          if (history.length > LIMIT) history.pop();
      }
  }

  // --- 3. Selection Logic (Ctrl+Click) ---
  function handleRowClick(event: MouseEvent, gid: string) {
      // Prevent selection if clicking actions/buttons inside the row
      if ((event.target as HTMLElement).closest('button, a')) return;

      if (event.ctrlKey || event.metaKey) {
          // Toggle Selection
          if (selectedGids.includes(gid)) {
              selectedGids = selectedGids.filter(id => id !== gid);
          } else {
              selectedGids = [...selectedGids, gid];
          }
      } else {
          // Exclusive Selection
          if (selectedGids.length === 1 && selectedGids[0] === gid) {
             selectedGids = []; // Deselect if clicking same row again
          } else {
             selectedGids = [gid];
          }
      }
  }

  // --- 4. Actions ---
  async function handleDelete(gids: string[]) {
      if (!confirm(`Delete ${gids.length} items?`)) return;
      try {
          await fetch('/api/auth/user/history/delete', {
              method: 'DELETE',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ gids, delete_file: deleteWithFile })
          });
          toast.success("Deleted");
          selectedGids = [];
          refresh(currentPage);
      } catch(e) { toast.error("Delete failed"); }
  }

  async function handleRetry(item: ItemMetaData) {
      if (!item.sourceUri) return toast.error("No source URI available");
      try {
           await fetch('/api/aria2/add', { 
               method: 'POST', 
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ uris: [item.sourceUri] }) 
           });
          toast.success("Restarted");
      } catch(e) { toast.error("Retry failed"); }
  }

  // --- Helpers ---
  function formatBytes(bytes: string | null | undefined) {
      if (!bytes || bytes === "0") return '-';
      const b = parseInt(bytes);
      if (isNaN(b) || b === 0) return '-';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatSpeed(bytes: string | undefined) {
      if (!bytes || bytes === "0") return '';
      return formatBytes(bytes) + '/s';
  }

  function getStatusVariant(status: string) {
      switch (status) {
          case 'error': return 'destructive';
          case 'active': return 'default';
          case 'complete': return 'secondary';
          default: return 'outline';
      }
  }
  
  function getStatusClass(status: string) {
       switch(status) {
          case 'complete': return 'bg-green-500/15 text-green-700 border-green-500/20';
          case 'waiting': return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/20';
          case 'active': return 'animate-pulse bg-blue-500/15 text-blue-700 border-blue-500/20';
          default: return '';
      }
  }

  onMount(() => {
      refresh(1);
      connectWs();
  });
  onDestroy(() => { if (ws) ws.close(); });
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      {#if globalStats.downloadSpeed !== "0"}
        <Badge variant="outline" class="gap-1 font-mono text-xs">
             <Activity class="h-3 w-3 text-blue-500" />
             DL: {formatSpeed(globalStats.downloadSpeed)}
        </Badge>
      {/if}
       {#if globalStats.uploadSpeed !== "0"}
        <Badge variant="outline" class="gap-1 font-mono text-xs">
             <Upload class="h-3 w-3 text-green-500" />
             UL: {formatSpeed(globalStats.uploadSpeed)}
        </Badge>
      {/if}

      {#if loading} <LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" /> {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if selectedGids.length > 0}
        <div class="flex items-center gap-3 bg-destructive/10 text-destructive px-3 py-1.5 rounded-md text-sm font-medium animate-in fade-in slide-in-from-right-2">
          <span>{selectedGids.length} selected</span>
          <div class="flex items-center gap-2 border-l border-destructive/20 pl-3">
            <Checkbox id="del-disk" bind:checked={deleteWithFile} class="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" />
            <label for="del-disk" class="cursor-pointer text-xs">Files</label>
          </div>
          <Button variant="destructive" size="sm" class="h-7 px-2 ml-2" onclick={() => handleDelete(selectedGids)}>
            <Trash2 class="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <div class="rounded-md border bg-card select-none">
    <Table.Root>
      <!-- don't need header -->
      <!-- <Table.Header> -->
      <!--   <Table.Row> -->
      <!--     <Table.Head class=""></Table.Head> -->
      <!--   </Table.Row> -->
      <!-- </Table.Header> -->
      <Table.Body>
        {#each history as item (item.gid)}
          <Table.Row 
             class="cursor-pointer transition-colors hover:bg-muted/50 data-[selected=true]:bg-muted" 
             data-selected={selectedGids.includes(item.gid)}
             onclick={(e) => handleRowClick(e, item.gid)}
          >
            <Table.Cell>
              <div class="flex flex-col gap-1">
                <span class="font-medium truncate max-w-[200px] sm:max-w-[400px]" title={item.name || item.gid}>
                  {item.name || 'Unknown Task'}
                </span>
                {#if item.status === 'error'}
                  <span class="text-[10px] text-destructive truncate max-w-[300px]" title={item.errorMessage}>
                    {item.errorMessage || "Unknown error"} (Code: {item.errorCode})
                  </span>
                {:else}
                   <div class="flex items-center text-[10px] text-muted-foreground gap-2">
                     <span class="truncate max-w-[250px]">{item.dir || ''}</span>
                     {#if item.downloadSpeed && item.downloadSpeed !== "0"}
                        <span class="text-blue-500 font-mono flex items-center gap-0.5">
                             <Download class="h-2.5 w-2.5" /> {formatSpeed(item.downloadSpeed)}
                        </span>
                     {/if}
                  </div>
                {/if}
              </div>
            </Table.Cell>

            <Table.Cell>
                <div class="flex flex-col text-xs font-mono">
                    <span class="flex items-center gap-1">
                        <Download class="h-3 w-3 opacity-50" /> {formatBytes(item.completedLength)} / {formatBytes(item.totalLength)}
                    </span>
                    {#if item.uploadedLength && item.uploadedLength !== "0"}
                        <span class="flex items-center gap-1 text-muted-foreground">
                            <Upload class="h-3 w-3 opacity-50" /> {formatBytes(item.uploadedLength)}
                        </span>
                    {/if}
                </div>
            </Table.Cell>

            <Table.Cell>
              <Badge variant={getStatusVariant(item.status)} class={getStatusClass(item.status)}>
                {item.status.toUpperCase()}
              </Badge>
            </Table.Cell>

            <Table.Cell class="hidden md:table-cell text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString()}
            </Table.Cell>

            <Table.Cell class="text-right" onclick={(e) => e.stopPropagation()}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger class={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}>
                   <EllipsisVertical class="h-4 w-4" />
                   <span class="sr-only">Open menu</span>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Label>Actions</DropdownMenu.Label>
                  <DropdownMenu.Item onclick={() => navigator.clipboard.writeText(item.gid)}>Copy GID</DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  {#if ['error', 'stopped', 'removed'].includes(item.status)}
                    <DropdownMenu.Item onclick={() => handleRetry(item)}>Retry</DropdownMenu.Item>
                  {/if}
                  <DropdownMenu.Item>Open Location</DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item class="text-destructive" onclick={() => handleDelete([item.gid])}>Delete</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
              No downloads found.
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <div class="flex items-center justify-end space-x-2 py-4">
    <div class="flex-1 text-sm text-muted-foreground">
       Page {currentPage} of {totalPages}
    </div>
    <div class="space-x-2">
      <Button variant="outline" size="sm" onclick={() => refresh(currentPage - 1)} disabled={currentPage <= 1 || loading}>
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onclick={() => refresh(currentPage + 1)} disabled={currentPage >= totalPages || loading}>
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
