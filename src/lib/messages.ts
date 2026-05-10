import { sql } from "kysely";
import type { Message, MessageStatus, User } from "~/lib/endpoint/types";
import { list_friends } from "~/lib/friends";
import { QueryBuilder } from "~/lib/query_builder";
import type { SQLite } from "~/lib/sqlite/interface";

export type MessageThread = User & {
	last_message_content: string;
	last_message_created_at: string;
	last_message_sender_id: string;
	last_message_status: MessageStatus;
};

export function create_chat_message_id() {
	if (
		globalThis.crypto !== undefined &&
		typeof globalThis.crypto.randomUUID === "function"
	) {
		return globalThis.crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function list_chat_messages(
	sqlite: SQLite,
	owner_id: string,
	chat_user_id: string,
) {
	return await sqlite.query<Message>(
		QueryBuilder.selectFrom("chat_message")
			.select([
				"id",
				"owner_id",
				"chat_user_id",
				"sender_id",
				"content",
				"status",
				"created_at",
				"updated_at",
				"retry_count",
				"last_error",
			])
			.where("owner_id", "=", owner_id)
			.where("chat_user_id", "=", chat_user_id)
			.orderBy("created_at", "asc")
			.compile(),
	);
}

export async function get_chat_message(
	sqlite: SQLite,
	owner_id: string,
	id: string,
) {
	return (
		await sqlite.query<Message>(
			QueryBuilder.selectFrom("chat_message")
				.select([
					"id",
					"owner_id",
					"chat_user_id",
					"sender_id",
					"content",
					"status",
					"created_at",
					"updated_at",
					"retry_count",
					"last_error",
				])
				.where("owner_id", "=", owner_id)
				.where("id", "=", id)
				.limit(1)
				.compile(),
		)
	).at(0);
}

export async function save_chat_message(sqlite: SQLite, message: Message) {
	await sqlite.execute(
		QueryBuilder.insertInto("chat_message")
			.values({
				id: message.id,
				owner_id: message.owner_id,
				chat_user_id: message.chat_user_id,
				sender_id: message.sender_id,
				content: message.content,
				status: message.status,
				created_at: message.created_at,
				updated_at: message.updated_at,
				retry_count: message.retry_count,
				last_error: message.last_error ?? null,
			})
			.onConflict((oc) =>
				oc.columns(["owner_id", "id"]).doUpdateSet({
					chat_user_id: sql`excluded.chat_user_id`,
					sender_id: sql`excluded.sender_id`,
					content: sql`excluded.content`,
					status: sql`excluded.status`,
					updated_at: sql`excluded.updated_at`,
					retry_count: sql`excluded.retry_count`,
					last_error: sql`excluded.last_error`,
				}),
			)
			.compile(),
	);
}

export async function update_chat_message_status(
	sqlite: SQLite,
	input: {
		owner_id: string;
		id: string;
		status: MessageStatus;
		retry_count?: number;
		last_error?: string | null;
	},
	now = () => new Date().toISOString(),
) {
	await sqlite.execute(
		QueryBuilder.updateTable("chat_message")
			.set({
				status: input.status,
				updated_at: now(),
				...(input.retry_count === undefined
					? {}
					: { retry_count: input.retry_count }),
				...(input.last_error === undefined
					? {}
					: { last_error: input.last_error }),
			})
			.where("owner_id", "=", input.owner_id)
			.where("id", "=", input.id)
			.compile(),
	);
}

export async function list_message_threads(sqlite: SQLite, owner_id: string) {
	const messages = await sqlite.query<Message>(
		QueryBuilder.selectFrom("chat_message")
			.select([
				"id",
				"owner_id",
				"chat_user_id",
				"sender_id",
				"content",
				"status",
				"created_at",
				"updated_at",
				"retry_count",
				"last_error",
			])
			.where("owner_id", "=", owner_id)
			.orderBy("created_at", "desc")
			.compile(),
	);
	const latest_by_chat_user = new Map<string, Message>();
	for (const message of messages) {
		if (!latest_by_chat_user.has(message.chat_user_id)) {
			latest_by_chat_user.set(message.chat_user_id, message);
		}
	}
	const friends = new Map(
		(await list_friends(sqlite, owner_id)).map((friend) => [friend.id, friend]),
	);
	return [...latest_by_chat_user.values()]
		.map((message): MessageThread | undefined => {
			const friend = friends.get(message.chat_user_id);
			if (!friend) return;
			return {
				...friend,
				last_message_content: message.content,
				last_message_created_at: message.created_at,
				last_message_sender_id: message.sender_id,
				last_message_status: message.status,
			};
		})
		.filter((thread): thread is MessageThread => thread !== undefined);
}
