import { MessageCircleMoreIcon, UserIcon, UsersIcon } from "lucide-solid";
import type { Setter } from "solid-js";

export type SidebarButtonGroupState = null | "message" | "friend" | "group";

export default function SidebarButtonGroup(props: {
	set_state: Setter<SidebarButtonGroupState>;
}) {
	return (
		<div class="join join-vertical px-2">
			<label
				aria-label="消息"
				class="join-item btn btn-square bg-base-100 has-checked:bg-neutral has-checked:text-neutral-content"
			>
				<input
					type="radio"
					class="hidden"
					name="options"
					onClick={(e) =>
						props.set_state((v) => {
							if (v !== "message") {
								return "message";
							} else {
								e.currentTarget.checked = false;
								return null;
							}
						})
					}
				/>
				<MessageCircleMoreIcon />
			</label>
			<label
				aria-label="好友"
				class="join-item btn btn-square bg-base-100 has-checked:bg-neutral has-checked:text-neutral-content"
			>
				<input
					type="radio"
					class="hidden"
					name="options"
					onClick={(e) =>
						props.set_state((v) => {
							if (v !== "friend") {
								return "friend";
							} else {
								e.currentTarget.checked = false;
								return null;
							}
						})
					}
				/>
				<UserIcon />
			</label>
			<label
				aria-label="群组"
				class="join-item btn btn-square bg-base-100 has-checked:bg-neutral has-checked:text-neutral-content"
			>
				<input
					type="radio"
					class="hidden"
					name="options"
					onClick={(e) =>
						props.set_state((v) => {
							if (v !== "group") {
								return "group";
							} else {
								e.currentTarget.checked = false;
								return null;
							}
						})
					}
				/>
				<UsersIcon />
			</label>
		</div>
	);
}
