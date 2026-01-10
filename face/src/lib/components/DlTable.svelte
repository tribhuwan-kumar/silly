<script lang="ts">
  import { onMount } from 'svelte';
  import { buttonVariants } from "$lib/components/ui/button";
  import { 
    aria2, 
    historyStore, 
    globalStats, 
    selectedGids, 
    toggleSelection, 
    selectExclusive,
    clearSelection,
  } from '$lib/aria2/client';

  import * as Table from "$lib/components/ui/table";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { 
    EllipsisVertical, ChevronsUp, ChevronsDown, CircleCheck, X, 
    LoaderCircle, ChevronLeft, ChevronRight, Download, Upload,
  } from '@lucide/svelte';

  let loading = false;
  let deleteWithFile = false;
  let currentPage = 1;
  let totalPages = 1;
  let totalItems = 0;

  $: count = $selectedGids.length;
  $: hasSelection = count > 0;

  async function refresh(page = 1) {
    loading = true;
    const json = await aria2.loadInitialData(page);
    if (json && json.meta) {
      currentPage = json.meta.currentPage;
      totalPages = json.meta.totalPages;
      totalItems = json.meta.totalItems;
    }
    clearSelection();
    loading = false;
  }

  function handleRowClick(event: MouseEvent, gid: string) {
    if ((event.target as HTMLElement).closest('button, a')) return;

    if (event.ctrlKey || event.metaKey) {
      toggleSelection(gid);
    } else {
      selectExclusive(gid);
    }
  }

  function handleDelete(gids: string[]) {
    if (!confirm(`Delete ${gids.length} items?`)) return;
    aria2.delete(gids, deleteWithFile);
  }

  function handleRetry(item: any) {
    if (!item.sourceUri) return;
    aria2.retry(item.sourceUri);
  }

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
    aria2.connect();
    refresh(1);
  });
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 mb-2 min-h-8 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4 text-sm text-muted-foreground">
      {#if $globalStats.downloadSpeed !== "0"}
        <Badge variant="outline" class="gap-1 font-mono text-xs animate-in fade-in zoom-in duration-200">
          <ChevronsDown  class="h-3 w-3 text-accent-foreground" />
          DL: {formatSpeed($globalStats.downloadSpeed)}
        </Badge>
      {/if}
      {#if $globalStats.uploadSpeed !== "0"}
        <Badge variant="outline" class="gap-1 font-mono text-xs animate-in fade-in zoom-in duration-200">
          <ChevronsUp class="h-3 w-3 text-accent-foreground" />
          UL: {formatSpeed($globalStats.uploadSpeed)}
        </Badge>
      {/if}
    </div>
    <div class="float-right flex items-center gap-4 text-sm text-muted-foreground mr-4">
      {#if hasSelection}
        <div class="flex float-right items-center gap-2 bg-primary/10 text-primary px-2 py-1 rounded-full animate-in fade-in zoom-in duration-200">
          <CircleCheck class="h-3 w-3" />
          <span class="font-mono text-xs">{count} Selected</span>
          <button 
            onclick={clearSelection}
            class="ml-2 hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      {/if}
    </div>
      {#if loading} <LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" /> {/if}
  </div>

  <div class="rounded-md border bg-card select-none mr-6">
    <Table.Root>
      <Table.Body>
        {#each $historyStore as item (item.gid)}
          <Table.Row 
            class="cursor-pointer transition-colors hover:bg-muted/50 data-[selected=true]:bg-muted" 
            data-selected={$selectedGids.includes(item.gid)}
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
