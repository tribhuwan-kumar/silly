import { writable } from "svelte/store";
import { browser } from "$app/environment";

export const authState = writable<{
  role: string | null;
  username: string | null;
  isAuthenticated: boolean;
}>({
  role: null,
  username: null,
  isAuthenticated: false,
});

export async function checkAuth() {
  if (!browser) return;
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      console.log("current user info:", data);
      authState.set({
        isAuthenticated: true,
        username: data.username,
        role: data.role
      });
      return true;
    } else {
      // Cookie invalid or missing
      authState.set({ isAuthenticated: false, username: null, role: null });
      return false;
    }
  } catch (e) {
    console.error("Auth check failed", e);
    return false;
  }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  authState.set({ isAuthenticated: false, username: null, role: null });
  window.location.href = "/";
}
