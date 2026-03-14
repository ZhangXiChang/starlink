import { createSignal, type Signal } from "solid-js";
import type { Person } from "~/lib/endpoint/types";
import { Toaster } from "~/lib/toaster";

export class ShellStore {
  toaster: Toaster;
  user_person: Signal<Person | undefined>;

  private constructor() {
    this.toaster = new Toaster();
    this.user_person = createSignal();
  }
  static new() {
    return new ShellStore();
  }
}
