<script lang="ts">
	import '../layout.css';
  import { ModeWatcher } from "mode-watcher";
  import { getSysStatus } from '$lib/system';
  import { Toaster } from "$lib/components/ui/sonner/index.js";
	let { children } = $props();
  getSysStatus();
</script>

<div class="app">
  <ModeWatcher />
	<main>
    {@render children()}

    <Toaster />
  </main>
</div>
