import { useParams } from "@solidjs/router";
import {
	MessagesSquareIcon,
	RefreshCwIcon,
	UserIcon,
	UserPlusIcon,
} from "lucide-solid";
import {
	createResource,
	createSignal,
	For,
	lazy,
	type Setter,
	Show,
} from "solid-js";
import type { User } from "~/lib/endpoint/types";
import { list_friends } from "~/lib/friends";
import { HomeContext, MainContext, use_context } from "../context";
import ErrorWidget from "../widgets/error";
import Image from "../widgets/image";
import Loading from "../widgets/loading";

const LazyAddFriendModal = lazy(() => import("~/components/modal/add_friend"));

function to_error(error: unknown) {
	return error instanceof Error ? error : new Error(String(error));
}

export default function FriendList(props: {
	set_chat_user: Setter<User | undefined>;
}) {
	let add_friend_dialog_ref: HTMLDialogElement | undefined;
	const [lazy_add_friend_modal_load, set_lazy_add_friend_modal_load] =
		createSignal(false);
	const main_store = use_context(MainContext);
	const home_store = use_context(HomeContext);
	const params = useParams<{ user_id: string }>();
	const [friends] = createResource(
		() => [params.user_id, home_store.friend_list_revision()] as const,
		async ([owner_id]) => await list_friends(main_store.sqlite, owner_id),
	);
	return (
		<>
			<dialog ref={add_friend_dialog_ref} class="modal" closedby="any">
				<Show when={lazy_add_friend_modal_load()}>
					<LazyAddFriendModal />
					<form method="dialog" class="modal-backdrop">
						<button />
					</form>
				</Show>
			</dialog>
			<div class="flex border-b border-base-300 p-2">
				<div class="flex gap-1 border-r border-base-300 pr-2 items-center">
					<UserIcon />
					<span class="select-none text-base-content text-sm font-bold">
						好友
					</span>
				</div>
				<div class="flex-1 flex justify-end gap-1">
					<div class="tooltip" data-tip="刷新好友列表">
						<button
							aria-label="刷新好友列表"
							class="btn btn-square btn-sm bg-base-100"
							onClick={() => home_store.refresh_friend_list()}
						>
							<RefreshCwIcon class="size-4" />
						</button>
					</div>
					<div class="tooltip" data-tip="添加好友">
						<button
							aria-label="添加好友"
							class="btn btn-square btn-sm bg-base-100"
							onClick={() => {
								add_friend_dialog_ref?.showModal();
								set_lazy_add_friend_modal_load(true);
							}}
						>
							<UserPlusIcon class="size-4" />
						</button>
					</div>
				</div>
			</div>
			<Show when={!friends.loading} fallback={<Loading />}>
				<Show
					when={friends.error === undefined}
					fallback={<ErrorWidget error={to_error(friends.error)} />}
				>
					<Show
						when={(friends()?.length ?? 0) > 0}
						fallback={
							<div class="flex-1 flex items-center justify-center">
								<span class="text-sm text-base-content/60">暂无好友</span>
							</div>
						}
					>
						<div class="flex-1 overflow-y-auto">
							<ul class="list w-full">
								<For each={friends()}>
									{(friend) => (
										<li class="list-row">
											<div class="avatar">
												<Show
													keyed
													when={friend.avatar}
													fallback={
														<UserIcon class="size-10 rounded-full bg-base-300" />
													}
												>
													{(v) => (
														<Image class="size-10 rounded-box" image={v} />
													)}
												</Show>
											</div>
											<div class="flex min-w-0 flex-col">
												<span class="truncate">{friend.name}</span>
												<span class="truncate text-xs text-base-content/60">
													{friend.bio}
												</span>
											</div>
											<button
												aria-label={`打开与 ${friend.name} 的聊天`}
												class="btn btn-square btn-ghost"
												onClick={() => props.set_chat_user(friend)}
											>
												<MessagesSquareIcon />
											</button>
										</li>
									)}
								</For>
							</ul>
						</div>
					</Show>
				</Show>
			</Show>
		</>
	);
}
