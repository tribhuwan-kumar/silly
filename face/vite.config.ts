import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isDevelopment = (mode === 'development');

  return {
    plugins: [sveltekit(), tailwindcss()],
    server: {
      ...(isDevelopment && {
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:8080',
            ws: true,
            secure: false,
            changeOrigin: true
          }
        }
      }),
    },
    test: {
      expect: { requireAssertions: true },
      projects: [
        {
          extends: './vite.config.ts',
          test: {
            name: 'client',
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: 'chromium', headless: true }]
            },
            include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
            exclude: ['src/lib/server/**']
          }
        },

        {
          extends: './vite.config.ts',
          test: {
            name: 'server',
            environment: 'node',
            include: ['src/**/*.{test,spec}.{js,ts}'],
            exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
          }
        }
      ]
    }
  };
});
