import { Toaster } from "~/lib/toaster";

export class ShellStore {
  toaster: Toaster;

  private constructor(toaster: Toaster) {
    this.toaster = toaster;
  }
  static new() {
    return new ShellStore(new Toaster());
  }
}
