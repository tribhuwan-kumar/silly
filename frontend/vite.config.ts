import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  const isDevelopment = (mode === 'development');
  const isProduction = mode === 'production';
  const isBuild = command === 'build';
  const packageJsonPath = path.resolve(__dirname, "./package.json");
  const packJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const appVersion = packJson.version;

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
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
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
