import { expect, test } from "@playwright/test";
import { createSignal } from "solid-js";
import type { Endpoint } from "../src/lib/endpoint/interface";
import type {
	Person,
	PersonProtocolEvent,
	User,
} from "../src/lib/endpoint/types";
import { HomeStore } from "../src/stores/home";
import type { MainStore } from "../src/stores/main";
import type { ShellStore } from "../src/stores/shell";

type Query = { sql: string; parameters?: readonly unknown[] };

class FakeSQLite {
	friends = new Set<string>();
	executed: Query[] = [];

	async query<T>(query: Query): Promise<T[]> {
		if (query.sql.includes('from "user"')) {
			return [
				{
					key: Uint8Array.from([1, 2, 3]),
					name: "owner",
					avatar: null,
					bio: "owner bio",
				},
			] as T[];
		}
		if (query.sql.includes("friend")) {
			const has_friend = query.parameters?.some((parameter) =>
				this.friends.has(String(parameter)),
			);
			return has_friend ? ([{ exists: 1 }] as T[]) : [];
		}
		return [];
	}

	async execute(query: Query) {
		this.executed.push(query);
	}
}

class FakeEndpoint implements Endpoint {
	events: Array<{ type: PersonProtocolEvent; remote_id: string }>;
	responses: Array<{ method: "accept" | "reject"; remote_id: string }> = [];
	requested_chats: string[] = [];
	closed = false;
	next_chat_result: bigint | null = 100n;
	private active_event?: { type: PersonProtocolEvent; remote_id: string };
	private pending_next_event?: {
		reject: (error: Error) => void;
	};

	constructor(events: Array<{ type: PersonProtocolEvent; remote_id: string }>) {
		this.events = [...events];
	}

	async close() {
		this.closed = true;
		this.pending_next_event?.reject(new Error("closed"));
	}

	id() {
		return "owner-id";
	}

	async person_protocol_next_event(): Promise<PersonProtocolEvent> {
		if (this.closed) throw new Error("closed");
		const event = this.events.shift();
		if (event) {
			this.active_event = event;
			return event.type;
		}
		return await new Promise<PersonProtocolEvent>((_resolve, reject) => {
			this.pending_next_event = { reject };
		});
	}

	async person_protocol_event<T>(method: string): Promise<T> {
		if (method === "remote_id") return this.active_event?.remote_id as T;
		if (method === "accept" || method === "reject") {
			if (!this.active_event) throw new Error("missing active event");
			this.responses.push({ method, remote_id: this.active_event.remote_id });
			this.active_event = undefined;
			return (method === "accept" ? 42n : undefined) as T;
		}
		throw new Error(`unexpected person protocol method: ${method}`);
	}

	async request_person(id: string): Promise<Person> {
		return { name: `remote ${id}`, bio: `bio ${id}` };
	}

	async request_friend(): Promise<boolean> {
		return true;
	}

	async request_chat(id: string): Promise<bigint | null> {
		this.requested_chats.push(id);
		return this.next_chat_result;
	}

	async subscribe_group(): Promise<bigint> {
		return 1n;
	}
}

class FakeEndpointModule {
	constructor(private endpoint: FakeEndpoint) {}

	async create_endpoint() {
		return this.endpoint;
	}
}

function create_stores(endpoint: FakeEndpoint, sqlite = new FakeSQLite()) {
	const [user, set_user] = createSignal<User>();
	const popups: Array<{ content: unknown; options: unknown }> = [];
	const shell_store = {
		toaster: {
			popup(content: unknown, options: unknown) {
				popups.push({ content, options });
				return () => {};
			},
		},
		user: [user, set_user],
	} as unknown as ShellStore;
	const main_store = {
		sqlite,
		endpoint_module: new FakeEndpointModule(endpoint),
	} as unknown as MainStore;
	return { shell_store, main_store, sqlite, popups };
}

async function wait_for(assertion: () => void | Promise<void>) {
	const deadline = Date.now() + 5000;
	let last_error: unknown;
	while (Date.now() < deadline) {
		try {
			await assertion();
			return;
		} catch (error) {
			last_error = error;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	throw last_error;
}

test("HomeStore rejects duplicate friend requests before accepting the next friend chat request", async () => {
	const endpoint = new FakeEndpoint([
		{ type: "FriendRequest", remote_id: "duplicate-friend" },
		{ type: "ChatRequest", remote_id: "chat-friend" },
	]);
	const { shell_store, main_store, sqlite } = create_stores(endpoint);
	sqlite.friends.add("duplicate-friend");
	sqlite.friends.add("chat-friend");

	const store = await HomeStore.new(shell_store, main_store, "owner-id");

	await wait_for(() => {
		expect(endpoint.responses).toEqual([
			{ method: "reject", remote_id: "duplicate-friend" },
			{ method: "accept", remote_id: "chat-friend" },
		]);
		expect(store.chat_connection_state("chat-friend")).toMatchObject({
			status: "connected",
			connection: 42n,
		});
	});
	await store.cleanup();
});

test("HomeStore rejects chat requests from non-friends", async () => {
	const endpoint = new FakeEndpoint([
		{ type: "ChatRequest", remote_id: "stranger" },
	]);
	const { shell_store, main_store } = create_stores(endpoint);

	const store = await HomeStore.new(shell_store, main_store, "owner-id");

	await wait_for(() => {
		expect(endpoint.responses).toEqual([
			{ method: "reject", remote_id: "stranger" },
		]);
		expect(store.chat_connection_state("stranger")).toMatchObject({
			status: "rejected",
		});
	});
	await store.cleanup();
});

test("HomeStore exposes outgoing chat connection status", async () => {
	const endpoint = new FakeEndpoint([]);
	const { shell_store, main_store, sqlite } = create_stores(endpoint);
	sqlite.friends.add("chat-friend");
	const store = await HomeStore.new(shell_store, main_store, "owner-id");

	await store.connect_chat("chat-friend");

	expect(endpoint.requested_chats).toEqual(["chat-friend"]);
	expect(store.chat_connection_state("chat-friend")).toMatchObject({
		status: "connected",
		connection: 100n,
	});
	await store.cleanup();
});
