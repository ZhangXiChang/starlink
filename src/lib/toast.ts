import type { JSX } from "solid-js";

type Toast = { level: "default" | "info" | "error"; content: JSX.Element };

export class Toaster {
  toasts = new Map<string, Toast>();

  // popup(toast: Toast) {
  //   this.toasts.set();
  // }
}
