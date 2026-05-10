import type {
	ChatTextMessage,
	Person,
	RelayConfig,
} from "~/lib/endpoint/types";
import type { Init } from "../interface";
import type { PersonProtocolEvent } from "./types";

export interface EndpointModule extends Init {
	create_endpoint(
		secret_key: Uint8Array,
		person: Person,
		relay_configs: RelayConfig[],
	): Promise<Endpoint>;
	generate_secret_key(): Uint8Array | Promise<Uint8Array>;
	get_secret_key_id(secret_key: Uint8Array): string | Promise<string>;
}

export interface Endpoint {
	close(): Promise<void>;
	id(): string | Promise<string>;
	person_protocol_next_event(): Promise<PersonProtocolEvent>;
	person_protocol_event<T>(method: string): Promise<T>;
	request_person(id: string): Promise<Person>;
	request_friend(id: string): Promise<boolean>;
	request_chat(id: string): Promise<bigint | null>;
	send_chat_text_message(
		connection: bigint,
		message: ChatTextMessage,
	): Promise<void>;
	next_chat_text_message(connection: bigint): Promise<ChatTextMessage>;
	subscribe_group(ticket: string): Promise<bigint>;
}
