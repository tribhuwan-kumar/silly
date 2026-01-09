<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { systemState } from '$lib/system';
  import { authState } from '$lib/auth/auth';
  import { LoaderCircle } from "@lucide/svelte";
  import { Card } from "$lib/components/ui/card";
  import LoginForm from '$lib/components/auth/LoginForm.svelte';
  import RegAdminForm from '$lib/components/auth/RegAdminForm.svelte';

  let loading = true;
  let showAdminRegForm = false;
  let showSuccessMessage = false;

  function handleSetupComplete() {
    showAdminRegForm = false;
    showSuccessMessage = true;
    if (showSuccessMessage) {
      toast.success("Administration account created", {
        description: "Please proceed to log in!!",
        closeButton: true,
        richColors: true,
        style: "cursor: pointer;"
      }) 
    }
  }

  onMount(async () => {
    console.log("isAuthenticated:", $authState.isAuthenticated)
    if ($authState.isAuthenticated) {
        goto('/dashboard');
        return;
    }
  });

  /* svelte reactive */
  $: if ($systemState.status) {
    showAdminRegForm = !$systemState.status.adminExists;
    loading = false;
  }

  console.log("show admin register:", !showAdminRegForm)
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  {#if loading}
    <div class="flex flex-col items-center animate-pulse">
      <LoaderCircle class="h-10 w-10 animate-spin" />
      <p class="mt-4">Connecting to Silly...</p>
    </div>
  {:else}
    <div in:fly={{ y: 20, duration: 400 }}>
      <Card class="w-96 shadow-lg border-t-4 shadow-[0px_-2px_0px_0px_var(--color-orange-400)]">
        {#if showAdminRegForm}
            <RegAdminForm oncomplete={handleSetupComplete} />
        {:else}
            <LoginForm />
        {/if}
      </Card>
    </div>
  {/if}
</div>
