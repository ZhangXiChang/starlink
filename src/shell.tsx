import { useIsRouting, type RouteSectionProps } from "@solidjs/router";
import { ShellStore } from "./stores/shell";
import { ErrorBoundary, For, onCleanup, Show, Suspense } from "solid-js";
import { ShellContext } from "./components/context";
import MenuBar from "./components/ui/menu_bar";
import Loading from "./components/widgets/loading";
import Error from "./components/widgets/error";

export function Shell(props: RouteSectionProps) {
  const store = ShellStore.new();
  const is_routing = useIsRouting();
  onCleanup(() => store.cleanup());
  return (
    <ShellContext.Provider value={store}>
      <div class="absolute w-dvw h-dvh flex flex-col bg-base-200">
        <MenuBar />
        <div class="flex-1 flex relative min-h-0">
          <Show when={is_routing()}>
            <progress class="progress progress-primary absolute rounded-none h-0.5" />
          </Show>
          <ErrorBoundary fallback={(error) => <Error error={error as Error} />}>
            <Suspense fallback={<Loading />}>{props.children}</Suspense>
          </ErrorBoundary>
        </div>
        <div class="toast">
          <For each={store.toaster.items}>
            {(v) => <div class={`alert alert-${v.level}`}>{v.content}</div>}
          </For>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
