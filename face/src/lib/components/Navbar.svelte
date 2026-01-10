<script lang="ts">
  import { 
    Plus, 
    Play, 
    Pause, 
    Trash2, 
    X, 
    CircleCheck 
  } from '@lucide/svelte';
  import AddDl from '$lib/components/AddDl.svelte';
  import { Button } from "$lib/components/ui/button";
  import { selectedGids, clearSelection } from '$lib/aria2/client';

  $: count = $selectedGids.length;
  $: hasSelection = count > 0;

  let addDialogOpen = false;

  function handleAdd() {
      addDialogOpen = true;
  }

  function handleStart() {
      // Future: await aria2.resume($selectedGids)
      clearSelection();
  }

  function handleStop() {
      // Future: await aria2.pause($selectedGids)
      clearSelection();
  }

  function handleRemove() {
      if (!confirm(`Remove ${count} downloads?`)) return;
      // Future: await aria2.remove($selectedGids)
      clearSelection();
  }
</script>

<div class="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10 w-full">
  <div class="flex justify-end float-right h-12 items-center px-4 gap-2">
    <Button 
      onclick={handleAdd}
      class="cursor-pointer"
      size="icon" 
      variant="ghost"
      title="Add downloads"
    >
      <Plus class="h-4 w-4 text-muted-foreground" />
    </Button>
    <AddDl
      bind:open={addDialogOpen}
      onclose={() => addDialogOpen = false}
    />
    <div class="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleStart}
        title="Start Selected"
      >
        <Play class="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleStop}
        title="Pause Selected"
      >
        <Pause class="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleRemove}
        title="Remove Selected"
      >
        <Trash2 class="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  </div>
</div>
