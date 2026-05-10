import { tryit } from "radash";
import { type Accessor, createSignal, type Setter } from "solid-js";
import { create_friend_request_toast } from "~/components/ui/friend_request_toast";
import type { Endpoint } from "~/lib/endpoint/interface";
import type { Person, User } from "~/lib/endpoint/types";
import { add_friend, friend_exists, save_friend_request } from "~/lib/friends";
import { QueryBuilder } from "~/lib/query_builder";
import type { MainStore } from "./main";
import type { ShellStore } from "./shell";

export class HomeStore {
	endpoint;
	set_user;
	friend_list_revision;
	private set_friend_list_revision;
	private closed = false;

	private constructor(
		endpoint: Endpoint,
		set_user: Setter<User | undefined>,
		friend_list_revision: Accessor<number>,
		set_friend_list_revision: Setter<number>,
	) {
		this.endpoint = endpoint;
		this.set_user = set_user;
		this.friend_list_revision = friend_list_revision;
		this.set_friend_list_revision = set_friend_list_revision;
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
		const store = new HomeStore(
			endpoint,
			set_user,
			friend_list_revision,
			set_friend_list_revision,
		);
		store.watch_person_protocol_events(shell_store, main_store, user_id);
		return store;
	}
	refresh_friend_list() {
		this.set_friend_list_revision((revision) => revision + 1);
	}
	private watch_person_protocol_events(
		shell_store: ShellStore,
		main_store: MainStore,
		owner_id: string,
	) {
		void (async () => {
			while (!this.closed) {
				const [event_error, event_type] = await tryit(() =>
					this.endpoint.person_protocol_next_event(),
				)();
				if (this.closed) return;
				if (event_error) {
					shell_store.toaster.popup(`好友请求监听失败：${event_error.message}`, {
						type: "error",
					});
					return;
				}
				if (event_type === "FriendRequest") {
					const [handle_error] = await tryit(() =>
						this.handle_friend_request(shell_store, main_store, owner_id),
					)();
					if (handle_error) {
						await tryit(() => this.endpoint.person_protocol_event("reject"))();
						shell_store.toaster.popup(
							`处理好友请求失败：${handle_error.message}`,
							{ type: "error" },
						);
					}
				}
			}
		})();
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
		await new Promise<void>((resolve) => {
			let close_toast = () => {};
			let responded = false;
			const respond = async (accepted: boolean) => {
				if (responded) return;
				responded = true;
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
		});
	}
	async cleanup() {
		this.closed = true;
		await this.endpoint.close();
		this.set_user();
	}
}
