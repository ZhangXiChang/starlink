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

export type MessageStatus = "sending" | "sent" | "failed" | "received";

export type Message = {
	id: string;
	owner_id: string;
	chat_user_id: string;
	sender_id: string;
	content: string;
	status: MessageStatus;
	created_at: string;
	updated_at: string;
	retry_count: number;
	last_error?: string | null;
};

export type FriendRequestStatus = "pending" | "accepted" | "rejected";
export type FriendRequestDirection = "incoming" | "outgoing";

export type FriendRequest = {
	owner_id: string;
	remote_id: string;
	direction: FriendRequestDirection;
	name: string;
	avatar?: Uint8Array;
	bio: string;
	status: FriendRequestStatus;
	created_at: string;
	responded_at?: string | null;
};
