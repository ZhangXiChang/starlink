import { createAsync, type RouteSectionProps } from "@solidjs/router";
import { For, onCleanup, Show } from "solid-js";
import { twMerge } from "tailwind-merge";
import { MainContext } from "~/components/context";
import { MainStore } from "~/stores/main";

export default function Main(props: RouteSectionProps) {
  const store = createAsync(() => MainStore.new());
  return (
    <Show keyed when={store()}>
      {(store) => {
        onCleanup(() => store.cleanup());
        return (
          <MainContext.Provider value={store}>
            {props.children}
            <div class="toast">
              <For each={store.toaster.toasts.values().toArray()}>
                {(v) => (
                  <div class={twMerge("alert", v.level)}>{v.content}</div>
                )}
              </For>
            </div>
          </MainContext.Provider>
        );
      }}
    </Show>
  );
}
