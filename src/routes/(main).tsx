import { createAsync, type RouteSectionProps } from "@solidjs/router";
import { onCleanup, Show } from "solid-js";
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
          </MainContext.Provider>
        );
      }}
    </Show>
  );
}
