import { uid } from "radash";
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
	content: JSX.Element;
	type: ToastType;
};

export class Toaster {
	toasts;
	private set_toasts;
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	constructor() {
		[this.toasts, this.set_toasts] = createSignal<Map<string, ToastItem>>(
			new Map(),
		);
	}
	private close(id: string) {
		const timer = this.timers.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
		this.set_toasts((v) => {
			const a = new Map(v);
			a.delete(id);
			return a;
		});
	}
	popup(
		content: JSX.Element,
		options: { type?: ToastType; duration?: number | null } = {},
	) {
		const id = uid(8);
		this.set_toasts((v) =>
			new Map(v).set(id, { content, type: options.type ?? "info" }),
		);
		if (options.duration !== null) {
			const timer = setTimeout(() => this.close(id), options.duration ?? 4000);
			this.timers.set(id, timer);
		}
		return () => {
			this.close(id);
		};
	}
}
