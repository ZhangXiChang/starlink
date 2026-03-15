import { createSignal, type Signal } from "solid-js";
import type { User } from "~/lib/endpoint/types";
import { Toaster } from "~/lib/toaster";

export class ShellStore {
  toaster: Toaster;
  user: Signal<User | undefined>;

  private constructor() {
    this.toaster = new Toaster();
    this.user = createSignal();
  }
  static new() {
    return new ShellStore();
  }
}
