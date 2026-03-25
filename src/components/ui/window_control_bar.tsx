import { createAsync } from "@solidjs/router";
import type { Window } from "@tauri-apps/api/window";
import { MaximizeIcon, MinimizeIcon, Minimize2Icon, XIcon } from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";

export default function WindowControlBar(props: { window: Window }) {
	const [is_maximized, set_is_maximized] = createSignal<boolean>();
	createAsync(async () => {
		set_is_maximized(await props.window.isMaximized());
	});
	onMount(() => {
		const un_on_resized = props.window.onResized(async () =>
			set_is_maximized(await props.window.isMaximized()),
		);
		onCleanup(async () => (await un_on_resized)());
	});
	return (
		<div class="flex-1 flex flex-col h-full">
			<div data-tauri-drag-region class="flex justify-end">
				<button
					class="btn btn-square btn-ghost btn-sm rounded-none"
					onClick={() => props.window.minimize()}
				>
					<Minimize2Icon class="size-4" />
				</button>
				<button
					class="btn btn-square btn-ghost btn-sm rounded-none"
					onClick={() => props.window.toggleMaximize()}
				>
					<Show
						when={is_maximized()}
						fallback={<MaximizeIcon class="size-4" />}
					>
						<MinimizeIcon class="size-4" />
					</Show>
				</button>
				<button
					class="btn btn-square btn-ghost btn-sm rounded-none btn-error text-base-content"
					onClick={() => props.window.close()}
				>
					<XIcon class="size-4" />
				</button>
			</div>
		</div>
	);
}
