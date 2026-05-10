import { createAsync } from "@solidjs/router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { UserIcon } from "lucide-solid";
import { For, Show, Suspense } from "solid-js";
import { twMerge } from "tailwind-merge";
import type { Message, User } from "~/lib/endpoint/types";
import { QueryBuilder } from "~/lib/query_builder";
import { MainContext, ShellContext, use_context } from "../context";
import Image from "../widgets/image";

const messageStatusText = (message: Message | undefined) => {
	if (message?.status === "sending") return "发送中";
	if (message?.status === "failed") return message.error_message ?? "发送失败";
	return "已发送";
};

const messageTimeText = (message: Message | undefined) => {
	if (!message) return "";
	return new Date(message.created_at).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
};

export default function ChatBar(props: { chat_user: User }) {
	const shell_store = use_context(ShellContext);
	const main_store = use_context(MainContext);
	const [user] = shell_store.user;
	const messages = createAsync(async () => {
		const u = user();
		if (!u) throw new Error("用户不存在");
		return await main_store.sqlite.query<Message>(
			QueryBuilder.selectFrom("chat_message")
				.select([
					"id",
					"owner_id",
					"chat_user_id",
					"sender_id",
					"content",
					"status",
					"created_at",
					"sort_at",
					"retry_count",
					"error_message",
				])
				.where("owner_id", "=", u.id)
				.where("chat_user_id", "=", props.chat_user.id)
				.orderBy("sort_at", "asc")
				.compile(),
		);
	});
	let message_list_ref: HTMLDivElement | undefined;
	const message_list_virtualizer = createVirtualizer({
		getScrollElement: () => message_list_ref ?? null,
		count: messages()?.length ?? 0,
		estimateSize: () => 90,
	});
	return (
		<div class="flex-1 flex flex-col p-2 pt-0 gap-2">
			<div class="flex items-center border rounded-box bg-base-100 border-neutral-200 p-2 gap-2">
				<div class="avatar cursor-pointer">
					<Show
						keyed
						when={props.chat_user.avatar}
						fallback={
							<UserIcon class="size-10 rounded-full bg-base-300 hover:ring ring-neutral-300" />
						}
					>
						{(avatar) => (
							<Image
								class="size-10 rounded-full hover:ring ring-neutral-300"
								image={avatar}
							/>
						)}
					</Show>
				</div>
				<div class="flex flex-col">
					<span class="text-base-content font-bold">
						{props.chat_user.name}
					</span>
					<span class="text-xs text-base-content/60">
						{props.chat_user.bio}
					</span>
				</div>
			</div>
			<Suspense>
				<div ref={message_list_ref} class="flex-1 overflow-y-auto">
					<div
						class="relative w-full"
						style={{ height: `${message_list_virtualizer.getTotalSize()}px` }}
					>
						<div
							class="absolute w-full flex flex-col px-1 gap-4"
							style={{
								transform: `translateY(${message_list_virtualizer.getVirtualItems().at(0)?.start ?? 0}px)`,
							}}
						>
							<For each={message_list_virtualizer.getVirtualItems()}>
								{(v) => {
									const message = () => messages()?.at(v.index);
									const is_remote_message = () =>
										message()?.sender_id === props.chat_user.id;
									return (
										<div
											class={twMerge(
												"chat p-0",
												is_remote_message() ? "chat-start" : "chat-end",
											)}
										>
											<div class="chat-image avatar">
												<Show
													keyed
													when={
														is_remote_message()
															? props.chat_user.avatar
															: user()?.avatar
													}
													fallback={
														<UserIcon class="size-10 rounded-full bg-base-300" />
													}
												>
													{(avatar) => (
														<Image
															class="size-10 rounded-full"
															image={avatar}
														/>
													)}
												</Show>
											</div>
											<div class="chat-header items-center">
												<span
													class={twMerge(
														"text-sm text-base-content font-bold",
														is_remote_message() ? undefined : "order-1",
													)}
												>
													{is_remote_message()
														? props.chat_user.name
														: user()?.name}
												</span>
												<time class="text-base-content/60">
													{messageTimeText(message())}
												</time>
											</div>
											<span class="border rounded-box bg-base-100 border-neutral-200 p-2">
												{message()?.content}
											</span>
											<div class="chat-footer text-base-content/60">
												{messageStatusText(message())}
											</div>
										</div>
									);
								}}
							</For>
						</div>
					</div>
				</div>
			</Suspense>
			<div class="flex">
				<textarea
					class="textarea flex-1 field-sizing-content resize-none min-h-0"
					placeholder="按回车发送消息"
				/>
			</div>
		</div>
	);
}
