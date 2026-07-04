let api: typeof import("@tauri-apps/api/window") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = await import("@tauri-apps/api/window");
}

export function get_window() {
  if (api) {
    return api.getCurrentWindow();
  }
}
