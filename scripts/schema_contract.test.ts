import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const schema = readFileSync("schema.prisma", "utf-8");
const endpointTypes = readFileSync("src/lib/endpoint/types.ts", "utf-8");

const modelBody = (name: string) => {
	const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
	if (!match) {
		throw new Error(`model ${name} was not found`);
	}
	return match[1];
};

describe("database schema contract", () => {
	test("friend rows are scoped by local owner and remote id", () => {
		const friend = modelBody("friend");

		expect(friend).not.toContain("id       String @id");
		expect(friend).toContain("@@id([owner_id, id])");
	});

	test("chat messages include stable ids, delivery state, and retry metadata", () => {
		const chatMessage = modelBody("chat_message");

		expect(chatMessage).toContain("id");
		expect(chatMessage).toContain("@id");
		expect(chatMessage).toContain("sender_id");
		expect(chatMessage).toContain("status");
		expect(chatMessage).toContain("created_at");
		expect(chatMessage).toContain("sort_at");
		expect(chatMessage).toContain("retry_count");
		expect(chatMessage).toContain("error_message");
	});

	test("friend requests are persisted for inbound and outbound flows", () => {
		const friendRequest = modelBody("friend_request");

		expect(friendRequest).toContain("owner_id");
		expect(friendRequest).toContain("remote_id");
		expect(friendRequest).toContain("direction");
		expect(friendRequest).toContain("status");
		expect(friendRequest).toContain("created_at");
		expect(friendRequest).toContain(
			"@@unique([owner_id, remote_id, direction])",
		);
	});
});

describe("TypeScript endpoint contract", () => {
	test("messages expose id, delivery status, sortable time, and retry metadata", () => {
		expect(endpointTypes).toContain("export type MessageStatus");
		expect(endpointTypes).toContain("id: string");
		expect(endpointTypes).toContain("owner_id: string");
		expect(endpointTypes).toContain("chat_user_id: string");
		expect(endpointTypes).toContain("sender_id: string");
		expect(endpointTypes).toContain("status: MessageStatus");
		expect(endpointTypes).toContain("sort_at: number");
		expect(endpointTypes).toContain("retry_count: number");
		expect(endpointTypes).toContain("error_message?: string | null");
	});

	test("friend requests have shared status and direction types", () => {
		expect(endpointTypes).toContain("export type FriendRequestStatus");
		expect(endpointTypes).toContain("export type FriendRequestDirection");
		expect(endpointTypes).toContain("export type FriendRequest =");
	});
});
