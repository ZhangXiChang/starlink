import { createSignal } from "solid-js";
import type { User } from "~/lib/endpoint/types";
import { Toaster } from "~/lib/toaster";

export class ShellStore {
  toaster;
  user;

  private constructor() {
    this.toaster = new Toaster();
    this.user = createSignal<User>();
  }
  static new() {
    return new ShellStore();
  }
}
