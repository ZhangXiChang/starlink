import { createTauRPCProxy, type JsonValue } from "~/generated/ipc_bindings";
import type { Endpoint, EndpointModule } from "./interface";
import type {
	ChatTextMessage,
	Person,
	PersonProtocolEvent,
	RelayConfig,
} from "./types";

export class EndpointModuleImpl implements EndpointModule {
	init() {
		return;
	}
	async create_endpoint(
		secret_key: Uint8Array,
		person: Person,
		relay_configs: RelayConfig[],
	) {
		return await EndpointImpl.new(secret_key, person, relay_configs);
	}
	async generate_secret_key() {
		return Uint8Array.from(
			await createTauRPCProxy().endpoint.generate_secret_key(),
		);
	}
	async get_secret_key_id(secret_key: Uint8Array) {
		return await createTauRPCProxy().endpoint.get_secret_key_id(
			Array.from(secret_key),
		);
	}
}

export class EndpointImpl implements Endpoint {
	private readonly handle;

	private constructor(handle: bigint) {
		this.handle = handle;
	}
	static async new(
		secret_key: Uint8Array,
		person: Person,
		relay_configs: RelayConfig[],
	) {
		return new EndpointImpl(
			await createTauRPCProxy().endpoint.open_endpoint(
				Array.from(secret_key),
				person as unknown as JsonValue,
				relay_configs,
			),
		);
	}
	async close() {
		await createTauRPCProxy().endpoint.close_endpoint(this.handle);
	}
	async id() {
		return await createTauRPCProxy().endpoint.id(this.handle);
	}
	async person_protocol_next_event() {
		return (await createTauRPCProxy().endpoint.person_protocol_next_event(
			this.handle,
		)) as PersonProtocolEvent;
	}
	async person_protocol_event<T>(method: string) {
		return (await createTauRPCProxy().endpoint.person_protocol_event(
			this.handle,
			method,
		)) as T;
	}
	async request_person(id: string) {
		return (await createTauRPCProxy().endpoint.request_person(
			this.handle,
			id,
		)) as unknown as Person;
	}
	async request_friend(id: string) {
		return await createTauRPCProxy().endpoint.request_friend(this.handle, id);
	}
	async request_chat(id: string) {
		return await createTauRPCProxy().endpoint.request_chat(this.handle, id);
	}
	async send_chat_text_message(connection: bigint, message: ChatTextMessage) {
		await createTauRPCProxy().endpoint.send_chat_text_message(
			this.handle,
			connection,
			message,
		);
	}
	async next_chat_text_message(connection: bigint) {
		return (await createTauRPCProxy().endpoint.next_chat_text_message(
			this.handle,
			connection,
		)) as unknown as ChatTextMessage;
	}
	async subscribe_group(ticket: string) {
		return await createTauRPCProxy().endpoint.subscribe_group(
			this.handle,
			ticket,
		);
	}
}
