import { createAsync } from "@solidjs/router";
import { UserIcon } from "lucide-solid";
import { createSignal, For, onMount, Show, Suspense } from "solid-js";
import { twMerge } from "tailwind-merge";
import type {
	ChatConnectionState,
	ChatConnectionStatus,
	Message,
	MessageStatus,
	User,
} from "~/lib/endpoint/types";
import { list_chat_messages } from "~/lib/messages";
import {
	HomeContext,
	MainContext,
	ShellContext,
	use_context,
} from "../context";
import Image from "../widgets/image";

function chat_connection_label(status: ChatConnectionStatus) {
	switch (status) {
		case "idle":
			return "未连接";
		case "connecting":
			return "连接中";
		case "connected":
			return "已连接";
		case "rejected":
			return "连接被拒绝";
		case "error":
			return "连接失败";
	}
}

function chat_connection_badge_class(state: ChatConnectionState) {
	return twMerge(
		"badge badge-sm shrink-0",
		state.status === "connected" && "badge-success",
		state.status === "connecting" && "badge-info",
		state.status === "rejected" && "badge-warning",
		state.status === "error" && "badge-error",
	);
}

function message_status_label(status: MessageStatus) {
	switch (status) {
		case "sending":
			return "发送中";
		case "sent":
			return "已发送";
		case "failed":
			return "发送失败";
		case "received":
			return "已接收";
	}
}

function format_message_time(value: string) {
	return new Date(value).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ChatBar(props: { chat_user: User }) {
	const shell_store = use_context(ShellContext);
	const main_store = use_context(MainContext);
	const home_store = use_context(HomeContext);
	const [user] = shell_store.user;
	const [draft_message, set_draft_message] = createSignal("");
	onMount(() => void home_store.connect_chat(props.chat_user.id));
	const connection_state = () =>
		home_store.chat_connection_state(props.chat_user.id);
	let preserve_next_line_break = false;
	const messages = createAsync(async () => {
		const u = user();
		if (!u) throw new Error("用户不存在");
		home_store.message_revision();
		return await list_chat_messages(
			main_store.sqlite,
			u.id,
			props.chat_user.id,
		);
	});
	const send_draft_message = () => {
		preserve_next_line_break = false;
		const content = draft_message().trim();
		if (content === "") return;
		set_draft_message("");
		void home_store.send_chat_message(props.chat_user.id, content);
	};
	const handle_draft_message_key_down = (event: KeyboardEvent) => {
		if (event.key !== "Enter") return;
		if (event.shiftKey) {
			preserve_next_line_break = true;
			return;
		}
		event.preventDefault();
		send_draft_message();
	};
	const handle_draft_message_before_input = (event: InputEvent) => {
		if (event.inputType !== "insertLineBreak") return;
		if (preserve_next_line_break) {
			preserve_next_line_break = false;
			return;
		}
		event.preventDefault();
		send_draft_message();
	};
	const message_sender_name = (message: Message) =>
		message.sender_id === props.chat_user.id
			? props.chat_user.name
			: user()?.name;
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
				<div class="flex min-w-0 flex-col">
					<span class="text-base-content font-bold">
						{props.chat_user.name}
					</span>
					<div class="flex min-w-0 items-center gap-2">
						<span class="truncate text-xs text-base-content/60">
							{props.chat_user.bio}
						</span>
						<span class={chat_connection_badge_class(connection_state())}>
							{chat_connection_label(connection_state().status)}
						</span>
					</div>
				</div>
			</div>
			<Suspense>
				<div class="flex-1 overflow-y-auto">
					<div class="flex min-h-full flex-col px-1 gap-4">
						<For each={messages()}>
							{(message) => (
								<div
									class={twMerge(
										"chat p-0",
										message.sender_id === props.chat_user.id
											? "chat-start"
											: "chat-end",
									)}
								>
									<div class="chat-image avatar">
										<Show
											keyed
											when={
												message.sender_id === props.chat_user.id
													? props.chat_user.avatar
													: user()?.avatar
											}
											fallback={
												<UserIcon class="size-10 rounded-full bg-base-300" />
											}
										>
											{(avatar) => (
												<Image class="size-10 rounded-full" image={avatar} />
											)}
										</Show>
									</div>
									<div class="chat-header items-center">
										<span
											class={twMerge(
												"text-sm text-base-content font-bold",
												message.sender_id === props.chat_user.id
													? undefined
													: "order-1",
											)}
										>
											{message_sender_name(message)}
										</span>
										<time class="text-base-content/60">
											{format_message_time(message.created_at)}
										</time>
									</div>
									<span class="border rounded-box bg-base-100 border-neutral-200 p-2">
										{message.content}
									</span>
									<div class="chat-footer flex items-center gap-2 text-base-content/60">
										<span>{message_status_label(message.status)}</span>
										<Show when={message.status === "failed"}>
											<button
												class="link link-error"
												aria-label="重试发送消息"
												onClick={() =>
													void home_store.retry_chat_message(
														props.chat_user.id,
														message.id,
													)
												}
											>
												重试
											</button>
										</Show>
									</div>
								</div>
							)}
						</For>
					</div>
				</div>
			</Suspense>
			<div class="flex">
				<textarea
					class="textarea flex-1 field-sizing-content resize-none min-h-0"
					disabled={connection_state().status !== "connected"}
					placeholder="按回车发送消息"
					value={draft_message()}
					onInput={(event) => set_draft_message(event.currentTarget.value)}
					onKeyDown={handle_draft_message_key_down}
					onBeforeInput={handle_draft_message_before_input}
				/>
			</div>
		</div>
	);
}
