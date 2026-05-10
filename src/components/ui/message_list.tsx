import { useParams } from "@solidjs/router";
import { MessageCircleMoreIcon, RefreshCwIcon, UserIcon } from "lucide-solid";
import { createResource, For, type Setter, Show } from "solid-js";
import type { User } from "~/lib/endpoint/types";
import { list_message_threads } from "~/lib/messages";
import { HomeContext, MainContext, use_context } from "../context";
import ErrorWidget from "../widgets/error";
import Image from "../widgets/image";
import Loading from "../widgets/loading";

function to_error(error: unknown) {
	return error instanceof Error ? error : new Error(String(error));
}

function format_message_time(value: string) {
	return new Date(value).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function MessageList(props: {
	set_chat_user: Setter<User | undefined>;
}) {
	const main_store = use_context(MainContext);
	const home_store = use_context(HomeContext);
	const params = useParams<{ user_id: string }>();
	const [threads] = createResource(
		() => [params.user_id, home_store.message_revision()] as const,
		async ([owner_id]) =>
			await list_message_threads(main_store.sqlite, owner_id),
	);
	return (
		<>
			<div class="flex border-b border-base-300 p-2">
				<div class="flex gap-1 border-r border-base-300 pr-2 items-center">
					<MessageCircleMoreIcon />
					<span class="select-none text-base-content text-sm font-bold">
						消息
					</span>
				</div>
				<div class="flex-1 flex justify-end gap-1">
					<div class="tooltip" data-tip="刷新消息列表">
						<button
							aria-label="刷新消息列表"
							class="btn btn-square btn-sm bg-base-100"
							onClick={() => home_store.refresh_messages()}
						>
							<RefreshCwIcon class="size-4" />
						</button>
					</div>
				</div>
			</div>
			<Show when={!threads.loading} fallback={<Loading />}>
				<Show
					when={threads.error === undefined}
					fallback={<ErrorWidget error={to_error(threads.error)} />}
				>
					<Show
						when={(threads()?.length ?? 0) > 0}
						fallback={
							<div class="flex-1 flex items-center justify-center">
								<span class="text-sm text-base-content/60">暂无消息</span>
							</div>
						}
					>
						<div class="flex-1 overflow-y-auto">
							<ul class="list w-full">
								<For each={threads()}>
									{(thread) => (
										<li class="list-row">
											<div class="avatar">
												<Show
													keyed
													when={thread.avatar}
													fallback={
														<UserIcon class="size-10 rounded-full bg-base-300" />
													}
												>
													{(avatar) => (
														<Image class="size-10 rounded-box" image={avatar} />
													)}
												</Show>
											</div>
											<button
												aria-label={`打开与 ${thread.name} 的消息`}
												class="min-w-0 flex flex-1 flex-col items-stretch text-left"
												onClick={() => props.set_chat_user(thread)}
											>
												<span class="flex min-w-0 items-center justify-between gap-2">
													<span class="truncate">{thread.name}</span>
													<time class="shrink-0 text-xs text-base-content/50">
														{format_message_time(
															thread.last_message_created_at,
														)}
													</time>
												</span>
												<span class="truncate text-xs text-base-content/60">
													{thread.last_message_content}
												</span>
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
