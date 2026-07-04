export interface Init {
  init(): void | Promise<void>;
}
export interface Free {
  free(): void | Promise<void>;
}
