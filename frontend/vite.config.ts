import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  const isDevelopment = (mode === 'development');
  const isProduction = mode === 'production';
  const isBuild = command === 'build';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    esbuild: {
      drop: isBuild && isProduction ? ['console', 'debugger'] : []
    },
    server: {
      ...(isDevelopment && {
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:6890',
            ws: true,
            secure: false,
            changeOrigin: true
          }
        }
      }),
    },
    test: {
      expect: { requireAssertions: true },
    }
  };
});
