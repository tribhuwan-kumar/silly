<script lang="ts">
  import { 
    Plus, 
    Play, 
    Pause, 
    Trash2, 
    X, 
    CircleCheck 
  } from '@lucide/svelte';
  import { selectedGids, clearSelection } from '$lib/aria2/client';
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import ThemeToggle from '@/components/ThemeToggle.svelte';
  import AddDl from '$lib/components/AddDl.svelte';
  import { fade, slide } from 'svelte/transition';

  // State derived from the store
  $: count = $selectedGids.length;
  $: hasSelection = count > 0;

  function handleAdd() {
      console.log("Trigger Add Modal");
  }

  function handleStart() {
      console.log("Start Selected:", $selectedGids);
      // Future: await aria2.resume($selectedGids)
      clearSelection();
  }

  function handleStop() {
      console.log("Stop Selected:", $selectedGids);
      // Future: await aria2.pause($selectedGids)
      clearSelection();
  }

  function handleRemove() {
      if (!confirm(`Remove ${count} downloads?`)) return;
      console.log("Remove Selected:", $selectedGids);
      // Future: await aria2.remove($selectedGids)
      clearSelection();
  }
</script>

<div class="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10 w-full">
  <div class="flex justify-end float-right h-12 items-center px-4 gap-2">
    <Button 
      onclick={handleAdd}
      class="gap-2"
      size="icon" 
      variant="ghost"
      title="Add downloads"
    >
      <Plus class="h-4 w-4 text-muted-foreground" />
      <AddDl onclose={() => {}} open={false} />
    </Button>

    <Separator orientation="vertical" class="h-6 mx-2" />

    <div class="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleStart}
        title="Start Selected"
      >
        <Play class="h-4 w-4 {hasSelection ? 'text-shadow-accent' : 'text-muted-foreground'}" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleStop}
        title="Pause Selected"
      >
        <Pause class="h-4 w-4 {hasSelection ? 'text-orange-500' : 'text-muted-foreground'}" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        disabled={!hasSelection} 
        onclick={handleRemove}
        title="Remove Selected"
      >
        <Trash2 class="h-4 w-4 {hasSelection ? 'text-red-600' : 'text-muted-foreground'}" />
      </Button>

      <Separator orientation="vertical" class="h-6 mx-2" />

      <ThemeToggle
        size="icon"
        variant="ghost"
        class="fixed right-2 z-50 text-muted-foreground" 
      />

    </div>

    <div class="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
      {#if hasSelection}
        <div class="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full animate-in fade-in zoom-in duration-200">
           <CircleCheck class="h-3 w-3" />
           <span class="font-medium">{count} Selected</span>
           <button onclick={clearSelection} class="ml-2 hover:bg-primary/20 rounded-full p-0.5">
             <X class="h-3 w-3" />
           </button>
        </div>
      {/if}
    </div>
  </div>
</div>
