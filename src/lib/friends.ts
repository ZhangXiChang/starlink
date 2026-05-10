import { sql } from "kysely";
import type {
	FriendRequestDirection,
	FriendRequestStatus,
	User,
} from "~/lib/endpoint/types";
import { QueryBuilder } from "~/lib/query_builder";
import type { SQLite } from "~/lib/sqlite/interface";

export type FriendSearchValidationResult =
	| { ok: true; id: string }
	| { ok: false; message: string };

export async function friend_exists(
	sqlite: SQLite,
	owner_id: string,
	id: string,
) {
	const result = await sqlite.query<{ exists: number }>(
		QueryBuilder.selectFrom("friend")
			.select((eb) => eb.val(1).as("exists"))
			.where("owner_id", "=", owner_id)
			.where("id", "=", id)
			.limit(1)
			.compile(),
	);
	return result.length !== 0;
}

export async function validate_friend_search(
	sqlite: SQLite,
	owner_id: string,
	raw_id: string,
): Promise<FriendSearchValidationResult> {
	const id = raw_id.trim();
	if (id === "") return { ok: false, message: "请输入用户ID" };
	if (id === owner_id) return { ok: false, message: "不能添加自己为好友" };
	if (await friend_exists(sqlite, owner_id, id)) {
		return { ok: false, message: "你们已经是好友" };
	}
	return { ok: true, id };
}

export async function list_friends(sqlite: SQLite, owner_id: string) {
	return await sqlite.query<User>(
		QueryBuilder.selectFrom("friend")
			.select(["id", "name", "avatar", "bio"])
			.where("owner_id", "=", owner_id)
			.orderBy("name", "asc")
			.compile(),
	);
}

export async function add_friend(
	sqlite: SQLite,
	owner_id: string,
	friend: User,
) {
	await sqlite.execute(
		QueryBuilder.insertInto("friend")
			.values({
				owner_id,
				id: friend.id,
				name: friend.name,
				avatar: friend.avatar ?? null,
				bio: friend.bio,
			})
			.onConflict((oc) =>
				oc.columns(["owner_id", "id"]).doUpdateSet({
					name: sql`excluded.name`,
					avatar: sql`excluded.avatar`,
					bio: sql`excluded.bio`,
				}),
			)
			.compile(),
	);
}

export async function save_friend_request(
	sqlite: SQLite,
	request: {
		owner_id: string;
		remote: User;
		direction: FriendRequestDirection;
		status: FriendRequestStatus;
	},
	now = () => new Date().toISOString(),
) {
	const timestamp = now();
	const responded_at = request.status === "pending" ? null : timestamp;
	await sqlite.execute(
		QueryBuilder.insertInto("friend_request")
			.values({
				owner_id: request.owner_id,
				remote_id: request.remote.id,
				direction: request.direction,
				name: request.remote.name,
				avatar: request.remote.avatar ?? null,
				bio: request.remote.bio,
				status: request.status,
				created_at: timestamp,
				responded_at,
			})
			.onConflict((oc) =>
				oc.columns(["owner_id", "remote_id", "direction"]).doUpdateSet({
					name: sql`excluded.name`,
					avatar: sql`excluded.avatar`,
					bio: sql`excluded.bio`,
					status: sql`excluded.status`,
					responded_at: sql`excluded.responded_at`,
				}),
			)
			.compile(),
	);
}
