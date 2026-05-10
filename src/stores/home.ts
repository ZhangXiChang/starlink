import { tryit } from "radash";
import { type Accessor, createSignal, type Setter } from "solid-js";
import type { Endpoint } from "~/lib/endpoint/interface";
import type {
	ChatConnectionState,
	ChatTextMessage,
	Message,
	Person,
	PersonProtocolEvent,
	User,
} from "~/lib/endpoint/types";
import { add_friend, friend_exists, save_friend_request } from "~/lib/friends";
import {
	create_chat_message_id,
	get_chat_message,
	save_chat_message,
	update_chat_message_status,
} from "~/lib/messages";
import { QueryBuilder } from "~/lib/query_builder";
import type { MainStore } from "./main";
import type { ShellStore } from "./shell";

export class HomeStore {
	endpoint;
	set_user;
	friend_list_revision;
	message_revision;
	chat_connections;
	private shell_store;
	private main_store;
	private owner_id;
	private set_friend_list_revision;
	private set_message_revision;
	private set_chat_connections;
	private event_loop?: Promise<void>;
	private chat_message_receivers = new Map<string, Promise<void>>();
	private cleanup_handlers = new Set<() => void>();
	private closed = false;

	private constructor(
		endpoint: Endpoint,
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
		set_user: Setter<User | undefined>,
		friend_list_revision: Accessor<number>,
		set_friend_list_revision: Setter<number>,
		message_revision: Accessor<number>,
		set_message_revision: Setter<number>,
		chat_connections: Accessor<Map<string, ChatConnectionState>>,
		set_chat_connections: Setter<Map<string, ChatConnectionState>>,
	) {
		this.endpoint = endpoint;
		this.shell_store = shell_store;
		this.main_store = main_store;
		this.owner_id = owner_id;
		this.set_user = set_user;
		this.friend_list_revision = friend_list_revision;
		this.set_friend_list_revision = set_friend_list_revision;
		this.message_revision = message_revision;
		this.set_message_revision = set_message_revision;
		this.chat_connections = chat_connections;
		this.set_chat_connections = set_chat_connections;
	}
	static async new(
		shell_store: ShellStore,
		main_store: MainStore,
		user_id: string,
	) {
		const user = (
			await main_store.sqlite.query<Person & { key: Uint8Array }>(
				QueryBuilder.selectFrom("user")
					.select(["key", "name", "avatar", "bio"])
					.where("id", "=", user_id)
					.limit(1)
					.compile(),
			)
		).at(0);
		if (!user) throw new Error("没有找到相关用户信息");
		const person: Person = {
			name: user.name,
			avatar: user.avatar,
			bio: user.bio,
		};
		const endpoint = await main_store.endpoint_module.create_endpoint(
			user.key,
			person,
			[],
		);
		const [, set_user] = shell_store.user;
		set_user({ id: user_id, ...person });
		const [friend_list_revision, set_friend_list_revision] = createSignal(0);
		const [message_revision, set_message_revision] = createSignal(0);
		const [chat_connections, set_chat_connections] = createSignal<
			Map<string, ChatConnectionState>
		>(new Map());
		const store = new HomeStore(
			endpoint,
			shell_store,
			main_store,
			user_id,
			set_user,
			friend_list_revision,
			set_friend_list_revision,
			message_revision,
			set_message_revision,
			chat_connections,
			set_chat_connections,
		);
		store.watch_person_protocol_events(shell_store, main_store, user_id);
		return store;
	}
	refresh_friend_list() {
		this.set_friend_list_revision((revision) => revision + 1);
	}
	refresh_messages() {
		this.set_message_revision((revision) => revision + 1);
	}
	chat_connection_state(remote_id: string): ChatConnectionState {
		return this.chat_connections().get(remote_id) ?? { status: "idle" };
	}
	private set_chat_connection_state(
		remote_id: string,
		state: ChatConnectionState,
	) {
		this.set_chat_connections((connections) => {
			const next = new Map(connections);
			next.set(remote_id, state);
			return next;
		});
	}
	async connect_chat(remote_id: string) {
		if (this.closed) return;
		const current = this.chat_connection_state(remote_id);
		if (current.status === "connecting" || current.status === "connected") {
			return;
		}
		this.set_chat_connection_state(remote_id, { status: "connecting" });
		const [error, connection] = await tryit(() =>
			this.endpoint.request_chat(remote_id),
		)();
		if (this.closed) return;
		if (error) {
			this.set_chat_connection_state(remote_id, {
				status: "error",
				error: error.message,
			});
			return;
		}
		if (connection === null) {
			this.set_chat_connection_state(remote_id, { status: "rejected" });
			return;
		}
		this.set_chat_connection_state(remote_id, {
			status: "connected",
			connection,
		});
		this.start_chat_message_receiver(remote_id, connection);
	}
	async send_chat_message(remote_id: string, raw_content: string) {
		const content = raw_content.trim();
		if (this.closed || content === "") return;
		const created_at = new Date().toISOString();
		const message: Message = {
			id: create_chat_message_id(),
			owner_id: this.owner_id,
			chat_user_id: remote_id,
			sender_id: this.owner_id,
			content,
			status: "sending",
			created_at,
			updated_at: created_at,
			retry_count: 0,
			last_error: null,
		};
		await save_chat_message(this.main_store.sqlite, message);
		this.refresh_messages();
		await this.dispatch_chat_message(remote_id, message);
	}
	async retry_chat_message(remote_id: string, message_id: string) {
		if (this.closed) return;
		const message = await get_chat_message(
			this.main_store.sqlite,
			this.owner_id,
			message_id,
		);
		if (!message) return;
		await update_chat_message_status(this.main_store.sqlite, {
			owner_id: this.owner_id,
			id: message.id,
			status: "sending",
			last_error: null,
		});
		this.refresh_messages();
		await this.dispatch_chat_message(remote_id, {
			...message,
			status: "sending",
		});
	}
	private async dispatch_chat_message(remote_id: string, message: Message) {
		const state = this.chat_connection_state(remote_id);
		if (state.status !== "connected" || state.connection === undefined) {
			await this.fail_chat_message(message, "聊天未连接");
			return;
		}
		const envelope: ChatTextMessage = {
			id: message.id,
			sender_id: this.owner_id,
			created_at: message.created_at,
			content: message.content,
		};
		const [send_error] = await tryit(() =>
			this.endpoint.send_chat_text_message(
				state.connection as bigint,
				envelope,
			),
		)();
		if (this.closed) return;
		if (send_error) {
			await this.fail_chat_message(message, send_error.message);
			return;
		}
		await update_chat_message_status(this.main_store.sqlite, {
			owner_id: this.owner_id,
			id: message.id,
			status: "sent",
			last_error: null,
		});
		this.refresh_messages();
	}
	private async fail_chat_message(message: Message, error: string) {
		await update_chat_message_status(this.main_store.sqlite, {
			owner_id: this.owner_id,
			id: message.id,
			status: "failed",
			retry_count: message.retry_count + 1,
			last_error: error,
		});
		this.refresh_messages();
	}
	private start_chat_message_receiver(remote_id: string, connection: bigint) {
		if (this.chat_message_receivers.has(remote_id)) return;
		const receiver = this.run_chat_message_receiver(
			remote_id,
			connection,
		).finally(() => this.chat_message_receivers.delete(remote_id));
		this.chat_message_receivers.set(remote_id, receiver);
	}
	private async run_chat_message_receiver(
		remote_id: string,
		connection: bigint,
	) {
		while (!this.closed) {
			const [receive_error, message] = await tryit(() =>
				this.endpoint.next_chat_text_message(connection),
			)();
			if (this.closed) return;
			if (receive_error) {
				const current = this.chat_connection_state(remote_id);
				if (current.connection === connection) {
					this.set_chat_connection_state(remote_id, {
						status: "error",
						error: receive_error.message,
					});
				}
				this.shell_store.toaster.popup(
					`接收聊天消息失败：${receive_error.message}`,
					{ type: "error" },
				);
				return;
			}
			const updated_at = new Date().toISOString();
			await save_chat_message(this.main_store.sqlite, {
				id: message.id,
				owner_id: this.owner_id,
				chat_user_id: remote_id,
				sender_id: remote_id,
				content: message.content,
				status: "received",
				created_at: message.created_at,
				updated_at,
				retry_count: 0,
				last_error: null,
			});
			this.refresh_messages();
		}
	}
	private watch_person_protocol_events(
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		this.event_loop = this.run_person_protocol_event_loop(
			shell_store,
			main_store,
			owner_id,
		);
	}
	private async run_person_protocol_event_loop(
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		while (!this.closed) {
			const [event_error, event_type] = await tryit(() =>
				this.endpoint.person_protocol_next_event(),
			)();
			if (this.closed) return;
			if (event_error) {
				shell_store.toaster.popup(
					`好友/聊天请求监听失败：${event_error.message}`,
					{
						type: "error",
					},
				);
				return;
			}
			const [handle_error] = await tryit(() =>
				this.handle_person_protocol_event(
					event_type,
					shell_store,
					main_store,
					owner_id,
				),
			)();
			if (this.closed) return;
			if (handle_error) {
				await tryit(() => this.endpoint.person_protocol_event("reject"))();
				shell_store.toaster.popup(
					`处理好友/聊天请求失败：${handle_error.message}`,
					{ type: "error" },
				);
			}
		}
	}
	private async handle_person_protocol_event(
		event_type: PersonProtocolEvent,
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		if (event_type === "FriendRequest") {
			await this.handle_friend_request(shell_store, main_store, owner_id);
			return;
		}
		await this.handle_chat_request(shell_store, main_store, owner_id);
	}
	private async handle_friend_request(
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		const remote_id =
			await this.endpoint.person_protocol_event<string>("remote_id");
		const person = await this.endpoint.request_person(remote_id);
		const remote: User = { id: remote_id, ...person };
		if (await friend_exists(main_store.sqlite, owner_id, remote_id)) {
			await save_friend_request(main_store.sqlite, {
				owner_id,
				remote,
				direction: "incoming",
				status: "rejected",
			});
			await this.endpoint.person_protocol_event("reject");
			shell_store.toaster.popup("已拒绝重复好友请求", { type: "info" });
			return;
		}
		await save_friend_request(main_store.sqlite, {
			owner_id,
			remote,
			direction: "incoming",
			status: "pending",
		});
		const { create_friend_request_toast } = await import(
			"~/components/ui/friend_request_toast"
		);
		await new Promise<void>((resolve) => {
			let close_toast = () => {};
			let responded = false;
			let cancel = () => {};
			const resolve_once = () => {
				this.cleanup_handlers.delete(cancel);
				resolve();
			};
			cancel = () => {
				if (responded) return;
				responded = true;
				close_toast();
				resolve_once();
			};
			this.cleanup_handlers.add(cancel);
			const respond = async (accepted: boolean) => {
				if (responded) return;
				responded = true;
				this.cleanup_handlers.delete(cancel);
				close_toast();
				const status = accepted ? "accepted" : "rejected";
				const [response_error] = await tryit(() =>
					this.endpoint.person_protocol_event(accepted ? "accept" : "reject"),
				)();
				if (response_error) {
					shell_store.toaster.popup(response_error.message, { type: "error" });
					resolve();
					return;
				}
				await save_friend_request(main_store.sqlite, {
					owner_id,
					remote,
					direction: "incoming",
					status,
				});
				if (accepted) {
					await add_friend(main_store.sqlite, owner_id, remote);
					this.refresh_friend_list();
					shell_store.toaster.popup("已同意好友请求", { type: "success" });
				} else {
					shell_store.toaster.popup("已拒绝好友请求", { type: "info" });
				}
				resolve();
			};
			close_toast = shell_store.toaster.popup(
				create_friend_request_toast({
					user: remote,
					on_accept: () => void respond(true),
					on_reject: () => void respond(false),
				}),
				{ duration: null, type: "info" },
			);
			if (this.closed) cancel();
		});
	}
	private async handle_chat_request(
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		const remote_id =
			await this.endpoint.person_protocol_event<string>("remote_id");
		if (!(await friend_exists(main_store.sqlite, owner_id, remote_id))) {
			await this.endpoint.person_protocol_event("reject");
			this.set_chat_connection_state(remote_id, { status: "rejected" });
			shell_store.toaster.popup("已拒绝非好友聊天请求", { type: "info" });
			return;
		}
		const connection =
			await this.endpoint.person_protocol_event<bigint>("accept");
		this.set_chat_connection_state(remote_id, {
			status: "connected",
			connection,
		});
		this.start_chat_message_receiver(remote_id, connection);
	}
	async cleanup() {
		this.closed = true;
		for (const cleanup_handler of [...this.cleanup_handlers]) cleanup_handler();
		const [close_error] = await tryit(() => this.endpoint.close())();
		if (this.event_loop) await tryit(() => this.event_loop)();
		await tryit(() => Promise.all([...this.chat_message_receivers.values()]))();
		this.set_user();
		if (close_error) throw close_error;
	}
}
