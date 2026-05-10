export type PersonProtocolEvent = "FriendRequest" | "ChatRequest";

export type Person = {
	name: string;
	avatar?: Uint8Array;
	bio: string;
};

export type User = { id: string } & Person;

export type RelayConfig = {
	url: string;
	quic_port: number;
};

export type MessageStatus = "sending" | "sent" | "failed";

export type Message = {
	id: string;
	owner_id: string;
	chat_user_id: string;
	sender_id: string;
	content: string;
	status: MessageStatus;
	created_at: string;
	sort_at: number;
	retry_count: number;
	error_message?: string | null;
};

export type FriendRequestStatus =
	| "pending"
	| "accepted"
	| "rejected"
	| "failed";

export type FriendRequestDirection = "incoming" | "outgoing";

export type FriendRequest = {
	id: string;
	owner_id: string;
	remote_id: string;
	direction: FriendRequestDirection;
	status: FriendRequestStatus;
	created_at: string;
	sort_at: number;
	error_message?: string | null;
};
