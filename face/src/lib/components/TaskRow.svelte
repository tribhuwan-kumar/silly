<script lang="ts">
  import { Progress } from "@/components/ui/progress";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Pause, Play, Trash2, File, Globe } from "@lucide/svelte";
  import { aria2 } from "$lib/aria2/client";
  import type { Aria2Download } from "$lib/aria2/types";

  export let task: Aria2Download;

  // Helpers
  $: progress = (parseInt(task.completedLength) / parseInt(task.totalLength)) * 100 || 0;
  $: speed = (parseInt(task.downloadSpeed) / 1024 / 1024).toFixed(2); // MB/s
  $: isTorrent = !!task.bittorrent;
  $: name = task.bittorrent?.info?.name || task.files[0]?.path?.split('/').pop() || task.gid;

  function togglePause() {
    if(task.status === 'active') aria2.call('pause', [task.gid]);
    else aria2.call('unpause', [task.gid]);
  }
</script>

<div class="flex items-center p-4 border rounded-lg bg-card text-card-foreground shadow-sm mb-3">
  <div class="mr-4 p-2 bg-muted rounded-full">
    {#if isTorrent}
      <File class="w-6 h-6 text-orange-500" />
    {:else}
      <Globe class="w-6 h-6 text-blue-500" />
    {/if}
  </div>

  <div class="flex-1 min-w-0 mr-6">
    <div class="flex items-center justify-between mb-1">
      <h3 class="font-medium truncate" title={name}>{name}</h3>
      <Badge variant={task.status === 'active' ? "default" : "secondary"}>
        {task.status}
      </Badge>
    </div>
    
    <Progress value={progress} class="h-2 mb-1" />
    
    <div class="flex justify-between text-xs text-muted-foreground">
      <span>{(parseInt(task.completedLength)/1024/1024).toFixed(1)} MB / {(parseInt(task.totalLength)/1024/1024).toFixed(1)} MB</span>
      {#if task.status === 'active'}
        <span class="text-green-600 font-mono">{speed} MB/s</span>
      {/if}
    </div>
  </div>

  <div class="flex gap-2">
    <Button variant="ghost" size="icon" onclick={togglePause}>
      {#if task.status === 'active'}
        <Pause class="w-4 h-4" />
      {:else}
        <Play class="w-4 h-4" />
      {/if}
    </Button>
    <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" onclick={() => aria2.call('forceRemove', [task.gid])}>
      <Trash2 class="w-4 h-4" />
    </Button>
  </div>
</div>
