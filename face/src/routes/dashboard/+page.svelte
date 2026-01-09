<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import Sidebar from "$lib/components/Sidebar.svelte";
import * as SidebarUI from "$lib/components/ui/sidebar/index.js";
import { checkAuth, authState } from '$lib/auth/auth';
import DlTable from '@/components/DlTable.svelte';
import Navbar from '$lib/components/Navbar.svelte';

onMount(async () => {
  const isLoggedIn = await checkAuth();
  console.log("isLoggedIn and isAuthenticated:", isLoggedIn, $authState.isAuthenticated)
  if (!isLoggedIn && !$authState.isAuthenticated) {
    goto('/');
  }
});

</script>

<div class="flex flex-row w-full h-full min-h-svh">
  <SidebarUI.Provider class="w-fit!">
    <SidebarUI.Trigger class="z-20 m-2 cursor-pointer" />
    <Sidebar />
  </SidebarUI.Provider>
  <div class="flex min-h-svh w-full flex-col">
    <Navbar />
    <DlTable />
  </div>
</div>
