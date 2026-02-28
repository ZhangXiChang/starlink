import "~/app.css";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Shell } from "./shell";

if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  const { createTauRPCProxy } = await import("~/generated/ipc_bindings");
  const log_info = console.info;
  console.info = (message: string) => {
    log_info(message);
    void createTauRPCProxy().log.info(message);
  };
  const log_warn = console.warn;
  console.warn = (message: string) => {
    log_warn(message);
    void createTauRPCProxy().log.warn(message);
  };
  const log_error = console.error;
  console.error = (error: Error) => {
    log_error(error);
    void createTauRPCProxy().log.error(error.message);
  };
  window.onunhandledrejection = (e) => {
    e.preventDefault();
    console.error(e.reason);
  };
}

export default function App() {
  return (
    <Router root={Shell}>
      <FileRoutes />
    </Router>
  );
}
