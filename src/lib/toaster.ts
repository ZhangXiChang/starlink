import { createStore, produce } from "solid-js/store";
import { uid } from "radash";
import type { JSX } from "solid-js";

const DEFAULT_DURATION = {
  info: 3000,
  success: 2000,
  warning: 4000,
  error: 5000,
};

export type ToastLevel = "info" | "success" | "warning" | "error";
export type Toast = {
  id: string;
  level: ToastLevel;
  content: JSX.Element;
};

export class Toaster {
  items;
  private set_items;
  private timeouts = new Map<string, number>();

  constructor() {
    [this.items, this.set_items] = createStore<Toast[]>([]);
  }
  popup(
    level: ToastLevel,
    content: JSX.Element,
    duration = DEFAULT_DURATION[level],
  ) {
    const id = uid(8);
    this.set_items(produce((draft) => draft.push({ id, level, content })));
    if (duration > 0) {
      this.timeouts.set(
        id,
        window.setTimeout(() => this.remove(id), duration),
      );
    }
    return () => this.remove(id);
  }
  private remove(id: string) {
    const timeout = this.timeouts.get(id);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      this.timeouts.delete(id);
    }
    this.set_items(
      produce((draft) => {
        const idx = draft.findIndex((t) => t.id === id);
        if (idx !== -1) draft.splice(idx, 1);
      }),
    );
  }
}
