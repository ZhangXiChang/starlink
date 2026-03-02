import { Toaster } from "~/lib/toaster";
import type { Store } from "./interface";

export class ShellStore implements Store {
  toaster: Toaster;

  private constructor(toaster: Toaster) {
    this.toaster = toaster;
  }
  static new() {
    return new ShellStore(new Toaster());
  }
  async cleanup() {}
}
