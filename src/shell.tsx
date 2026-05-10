import { type RouteSectionProps, useIsRouting } from "@solidjs/router";
import { ErrorBoundary, For, Show, Suspense } from "solid-js";
import { ShellContext } from "./components/context";
import MenuBar from "./components/ui/menu_bar";
import Error from "./components/widgets/error";
import Loading from "./components/widgets/loading";
import type { ToastType } from "./lib/toaster";
import { ShellStore } from "./stores/shell";

function toast_class(type: ToastType) {
	switch (type) {
		case "success":
			return "alert-success border-success/40";
		case "error":
			return "alert-error border-error/40";
		case "info":
			return "alert-info border-info/40";
	}
}

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
				<div class="toast toast-bottom toast-end z-50">
					<For each={store.toaster.toasts().values().toArray()}>
						{(v) => (
							<div
								class={`alert min-w-72 max-w-[calc(100dvw-2rem)] border shadow-lg ${toast_class(v.type)}`}
								role={v.type === "error" ? "alert" : "status"}
							>
								{v.content}
							</div>
						)}
					</For>
				</div>
			</div>
		</ShellContext.Provider>
	);
}
