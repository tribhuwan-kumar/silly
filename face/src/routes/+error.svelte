<script>
import { page } from '$app/state';
import Button from '@/components/ui/button/button.svelte';

</script>

{#if page.status === 404}
  <div class="w-full min-h-svh flex flex-col justify-center items-center">
    <img
      src="/favicon.svg"
      alt="404"
    />
    <p>Seriously, on 404!!??</p>
    <Button 
      href="/"
      variant="link"
      title="404"
    >
      Go home
    </Button>
  </div>
{/if}
