import { readFileSync } from "node:fs";

const schema = readFileSync("schema.prisma", "utf8");
const endpointTypes = readFileSync("src/lib/endpoint/types.ts", "utf8");

function modelBody(name: string) {
	const match = schema.match(
		new RegExp(`model\\s+${name}\\s+\\{([\\s\\S]*?)\\n\\}`),
	);
	if (!match) throw new Error(`Missing Prisma model: ${name}`);
	return match[1];
}

function expectMatch(source: string, pattern: RegExp, message: string) {
	if (!pattern.test(source)) throw new Error(message);
}

const friend = modelBody("friend");
expectMatch(
	friend,
	/^\s*@@id\(\[owner_id,\s*id\]\)/m,
	"friend must be keyed by owner_id + id",
);
if (/^\s*id\s+String\s+@id\b/m.test(friend)) {
	throw new Error("friend.id must not be a global primary key");
}

const chatMessage = modelBody("chat_message");
for (const [field, pattern] of [
	["id", /^\s*id\s+String\s+@id\b/m],
	["owner_id", /^\s*owner_id\s+String\b/m],
	["chat_user_id", /^\s*chat_user_id\s+String\b/m],
	["sender_id", /^\s*sender_id\s+String\b/m],
	["content", /^\s*content\s+String\b/m],
	["status", /^\s*status\s+String\b/m],
	["created_at", /^\s*created_at\s+DateTime\b/m],
	["updated_at", /^\s*updated_at\s+DateTime\b/m],
	["retry_count", /^\s*retry_count\s+Int\b/m],
	["last_error", /^\s*last_error\s+String\?/m],
] as const) {
	expectMatch(chatMessage, pattern, `chat_message is missing ${field}`);
}

const friendRequest = modelBody("friend_request");
for (const [field, pattern] of [
	["owner_id", /^\s*owner_id\s+String\b/m],
	["remote_id", /^\s*remote_id\s+String\b/m],
	["name", /^\s*name\s+String\b/m],
	["avatar", /^\s*avatar\s+Bytes\?/m],
	["bio", /^\s*bio\s+String\b/m],
	["status", /^\s*status\s+String\b/m],
	["created_at", /^\s*created_at\s+DateTime\b/m],
	["responded_at", /^\s*responded_at\s+DateTime\?/m],
] as const) {
	expectMatch(friendRequest, pattern, `friend_request is missing ${field}`);
}
expectMatch(
	friendRequest,
	/^\s*@@id\(\[owner_id,\s*remote_id\]\)/m,
	"friend_request must be keyed by owner_id + remote_id",
);

expectMatch(endpointTypes, /id:\s*string/, "Message type must include id");
expectMatch(
	endpointTypes,
	/sender_id:\s*string/,
	"Message type must include sender_id",
);
expectMatch(
	endpointTypes,
	/status:\s*MessageStatus/,
	"Message type must expose MessageStatus",
);
expectMatch(
	endpointTypes,
	/created_at:\s*string/,
	"Message type must expose sortable created_at",
);
expectMatch(
	endpointTypes,
	/retry_count:\s*number/,
	"Message type must include retry_count",
);
expectMatch(
	endpointTypes,
	/last_error\?:\s*string/,
	"Message type must include optional last_error",
);
