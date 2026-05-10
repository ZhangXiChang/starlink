import { SearchIcon, SendIcon, UserIcon } from "lucide-solid";
import { tryit } from "radash";
import { createSignal, Show } from "solid-js";
import type { User } from "~/lib/endpoint/types";
import {
	add_friend,
	save_friend_request,
	validate_friend_search,
} from "~/lib/friends";
import {
	HomeContext,
	MainContext,
	ShellContext,
	use_context,
} from "../context";
import Modal from "../modal";
import Image from "../widgets/image";

type AddFriendStatus = {
	type: "success" | "error" | "info";
	message: string;
};

function status_panel_class(type: AddFriendStatus["type"]) {
	switch (type) {
		case "success":
			return "border-success/40 bg-success/10";
		case "error":
			return "border-error/40 bg-error/10";
		case "info":
			return "border-info/40 bg-info/10";
	}
}

function status_dot_class(type: AddFriendStatus["type"]) {
	switch (type) {
		case "success":
			return "bg-success";
		case "error":
			return "bg-error";
		case "info":
			return "bg-info";
	}
}

export default function AddFriend() {
	const shell_store = use_context(ShellContext);
	const main_store = use_context(MainContext);
	const home_store = use_context(HomeContext);
	const [current_user] = shell_store.user;
	let search_user_id_input_ref: HTMLInputElement | undefined;
	const [search_user_result, set_search_user_result] = createSignal<User>();
	const [status, set_status] = createSignal<AddFriendStatus>();
	const [searching, set_searching] = createSignal(false);
	const [sending, set_sending] = createSignal(false);
	const set_message = (type: AddFriendStatus["type"], message: string) => {
		set_status({ type, message });
		shell_store.toaster.popup(message, { type });
	};
	const on_search_user = async () => {
		if (searching()) return;
		const owner = current_user();
		if (!owner) {
			set_message("error", "当前用户不存在");
			return;
		}
		set_searching(true);
		set_search_user_result();
		try {
			const validation = await validate_friend_search(
				main_store.sqlite,
				owner.id,
				search_user_id_input_ref?.value ?? "",
			);
			if (!validation.ok) {
				set_message("error", validation.message);
				return;
			}
			const [err, person] = await tryit(() =>
				home_store.endpoint.request_person(validation.id),
			)();
			if (err) {
				set_message("error", `搜索用户失败：${err.message}`);
				return;
			}
			set_search_user_result({ id: validation.id, ...person });
			set_status({ type: "success", message: "已找到用户" });
		} finally {
			set_searching(false);
		}
	};
	const on_send_friend_request = async (friend: User) => {
		if (sending()) return;
		const owner = current_user();
		if (!owner) {
			set_message("error", "当前用户不存在");
			return;
		}
		set_sending(true);
		try {
			const validation = await validate_friend_search(
				main_store.sqlite,
				owner.id,
				friend.id,
			);
			if (!validation.ok) {
				set_message("error", validation.message);
				return;
			}
			await save_friend_request(main_store.sqlite, {
				owner_id: owner.id,
				remote: friend,
				direction: "outgoing",
				status: "pending",
			});
			const [err, agree] = await tryit(() =>
				home_store.endpoint.request_friend(friend.id),
			)();
			if (err) {
				await save_friend_request(main_store.sqlite, {
					owner_id: owner.id,
					remote: friend,
					direction: "outgoing",
					status: "rejected",
				});
				set_message("error", `发送好友请求失败：${err.message}`);
				return;
			}
			await save_friend_request(main_store.sqlite, {
				owner_id: owner.id,
				remote: friend,
				direction: "outgoing",
				status: agree ? "accepted" : "rejected",
			});
			if (agree) {
				await add_friend(main_store.sqlite, owner.id, friend);
				home_store.refresh_friend_list();
				set_message("success", "对方同意好友请求");
			} else {
				set_message("info", "对方拒绝好友请求");
			}
		} finally {
			set_sending(false);
		}
	};
	return (
		<Modal title="添加好友" description="两地俱秋夕，相望共星河。">
			<div class="flex flex-col gap-3">
				<div class="flex flex-col items-start gap-2">
					<span class="font-bold">搜索用户</span>
					<div class="join w-full">
						<input
							ref={search_user_id_input_ref}
							aria-label="用户ID"
							class="join-item input flex-1"
							placeholder="用户ID"
							disabled={searching()}
							onKeyDown={async (e) => {
								if (e.key === "Enter") {
									await on_search_user();
								}
							}}
						/>
						<button
							class="join-item btn"
							disabled={searching()}
							onClick={on_search_user}
						>
							<Show when={searching()} fallback={<SearchIcon class="size-4" />}>
								<span class="loading loading-spinner loading-xs" />
							</Show>
							搜索
						</button>
					</div>
				</div>
				<Show when={status()}>
					{(v) => (
						<div
							class={`flex items-start gap-2 rounded-box border px-3 py-2 text-base-content shadow-sm ${status_panel_class(v().type)}`}
							role={v().type === "error" ? "alert" : "status"}
						>
							<span
								class={`mt-1.5 size-2 shrink-0 rounded-full ${status_dot_class(v().type)}`}
							/>
							<span class="min-w-0 flex-1 text-sm leading-5">
								{v().message}
							</span>
						</div>
					)}
				</Show>
				<Show when={search_user_result()}>
					{(v) => (
						<div class="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3">
							<div class="avatar">
								<Show
									keyed
									when={v().avatar}
									fallback={
										<UserIcon class="size-12 rounded-full bg-base-300" />
									}
								>
									{(v) => <Image class="size-12 rounded-full" image={v} />}
								</Show>
							</div>
							<div class="flex min-w-0 flex-col">
								<span class="font-bold">{v().name}</span>
								<span class="truncate text-sm text-base-content/60">
									{v().bio}
								</span>
							</div>
							<div class="flex flex-1 justify-end">
								<div class="tooltip tooltip-left" data-tip="发送好友请求">
									<button
										aria-label="发送好友请求"
										disabled={sending()}
										class="btn btn-square btn-sm"
										onClick={() => void on_send_friend_request(v())}
									>
										<Show
											when={sending()}
											fallback={<SendIcon class="size-4" />}
										>
											<span class="loading loading-spinner loading-xs" />
										</Show>
									</button>
								</div>
							</div>
						</div>
					)}
				</Show>
			</div>
		</Modal>
	);
}
