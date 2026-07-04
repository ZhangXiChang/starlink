let api: typeof import("@tauri-apps/plugin-opener") | undefined;
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  api = await import("@tauri-apps/plugin-opener");
}

export async function open_url(url: string) {
  if (api) {
    await api.openUrl(url);
  } else {
    open(url);
  }
}
