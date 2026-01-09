<script lang="ts">
  import { slide } from 'svelte/transition';
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import ThemeToggle from '@/components/ThemeToggle.svelte';
  import { 
    LoaderCircle,
  } from "@lucide/svelte";
  import {
    CardHeader, 
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter
  } from "$lib/components/ui/card";
  import { toast } from "svelte-sonner";

  let { oncomplete }: { oncomplete: () => void } = $props();
  let error = $state("");
  let passStep = $state(1);
  let username = $state("");
  let password = $state("");
  let reinputPassword = $state("");
  let loading = $state(false);

  function isValidPassword(password: string) {
    return password.length >= 8 && /[a-zA-Z]/.test(password);
  }

  function isValidUsername(username: string) {
    return /^[a-zA-Z0-9_]+$/.test(username);
  }

  async function handleRegAdmin(event: Event) {
    event.preventDefault();
    error = "";

    if (!isValidUsername(username)) {
      error = "Username can only contain letters, numbers, and underscores!!";
      loading = false;
      toast.error(error, {
        closeButton: true,
        richColors: true,
        style: "cursor: pointer;"
      }) 
      return;
    }

    if (passStep === 1) {
      if (!isValidPassword(password)) {
        error = "Password must be at least 8 characters!!";
        loading = false;
        toast.error(error, {
          closeButton: true,
          richColors: true,
          style: "cursor: pointer;"
        }) 
        return;
      }
      passStep = 2;
      return;
    }

    if (passStep === 2) {
      if (password !== reinputPassword) {
        error = "Passwords do not match.";
        toast.error(error, {
          closeButton: true,
          richColors: true,
          style: "cursor: pointer;"
        }) 
        return;
      }
      loading = true;
      try {
        const res = await fetch('/api/auth/reg/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Setup failed");
        if (res.ok) { oncomplete(); }

      } catch (e: any) {
        toast.error("Auth error:", {
          description: e.message,
          closeButton: true,
          richColors: true,
          style: "cursor: pointer;"
        }) 
      } finally {
        loading = false;
      }
    }
  }
</script>

<ThemeToggle
  size="icon"
  variant="outline"
  class="fixed bottom-4 left-4 z-50" 
/>

<CardHeader>
  <CardTitle class="text-2xl font-bold text-center">Register for admin</CardTitle>
  <CardDescription class="text-center">Create your admin account to get started.</CardDescription>
</CardHeader>

<CardContent>
  <form onsubmit={handleRegAdmin} class="space-y-4">
    <div class="space-y-2">
      <Label for="username">Username</Label>
      <Input id="username" type="text" bind:value={username} placeholder="admin" disabled={loading || passStep === 2} required />
    </div>

  <div class="overflow-hidden max-h-16">
    {#if passStep === 1}
      <div class="space-y-2" 
          out:slide={{ axis: 'x', duration: 400 }}
          onoutroend={() => passStep = 2}
        >
        <Label for="password">Password</Label>
        <Input id="password" type="password" bind:value={password} placeholder="********" disabled={loading} required />
      </div>
    {:else if passStep === 2}
      <div 
          class="space-y-2" 
          in:slide={{ axis: 'x', duration: 400, delay: 500 }}
        >
        <Label for="reinputPassword">Type again</Label>
        <Input id="reinputPassword" type="password" bind:value={reinputPassword} disabled={loading} required />
      </div>
    {/if}
  </div>

    <Button type="submit" class="w-full" disabled={loading}>
      {#if loading}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Creating...
      {:else if passStep === 1}
        Next
      {:else}
        Create account
      {/if}
    </Button>
  </form>
</CardContent>

<CardFooter class="justify-center text-xs text-muted-foreground">
  You're starting Silly for the first time, so setup admin!!
</CardFooter>
