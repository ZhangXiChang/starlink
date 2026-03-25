import { useIsRouting, type RouteSectionProps } from "@solidjs/router";
import { ShellStore } from "./stores/shell";
import { ErrorBoundary, For, Show, Suspense } from "solid-js";
import { ShellContext } from "./components/context";
import MenuBar from "./components/ui/menu_bar";
import Loading from "./components/widgets/loading";
import Error from "./components/widgets/error";

export function Shell(props: RouteSectionProps) {
	const store = ShellStore.new();
	const is_routing = useIsRouting();
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
					<For each={store.toaster.toasts().values().toArray()}>
						{(v) => <div class="alert">{v}</div>}
					</For>
				</div>
			</div>
		</ShellContext.Provider>
	);
}
