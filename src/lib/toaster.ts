import { uid } from "radash";
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";

export class Toaster {
	toasts;
	private set_toasts;

	constructor() {
		[this.toasts, this.set_toasts] = createSignal<Map<string, JSX.Element>>(
			new Map(),
		);
	}
	popup(content: JSX.Element) {
		const id = uid(8);
		this.set_toasts((v) => new Map(v).set(id, content));
		return () => {
			this.set_toasts((v) => {
				const a = new Map(v);
				a.delete(id);
				return a;
			});
		};
	}
}
