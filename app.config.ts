import {
  defineConfig,
  type SolidStartInlineConfig,
} from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export const config: SolidStartInlineConfig = {
  ssr: false,
  server: {
    preset: "cloudflare_module",
    rollupConfig: {
      external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
    },
    esbuild: { options: { target: "esnext" } },
  },
  vite: {
    clearScreen: false,
    build: {
      target: "esnext",
    },
    worker: {
      format: "es",
    },
    envPrefix: ["VITE_", "TAURI_ENV_"],
    plugins: [tailwindcss()],
  },
};
export default defineConfig(config);
