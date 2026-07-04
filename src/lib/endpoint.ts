export let EndpointModuleAdapter:
  | (typeof import("./endpoint/native"))["EndpointModuleImpl"]
  | (typeof import("./endpoint/web"))["EndpointModuleImpl"];

if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  const mod = await import("./endpoint/native");
  EndpointModuleAdapter = mod.EndpointModuleImpl;
} else {
  const mod = await import("./endpoint/web");
  EndpointModuleAdapter = mod.EndpointModuleImpl;
}
