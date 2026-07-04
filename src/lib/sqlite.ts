export let SQLiteModuleAdapter:
  | (typeof import("./sqlite/native"))["SQLiteModuleImpl"]
  | (typeof import("./sqlite/web"))["SQLiteModuleImpl"];

if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  const mod = await import("./sqlite/native");
  SQLiteModuleAdapter = mod.SQLiteModuleImpl;
} else {
  const mod = await import("./sqlite/web");
  SQLiteModuleAdapter = mod.SQLiteModuleImpl;
}
