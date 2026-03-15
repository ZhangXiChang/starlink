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

export type Message = {
  sender_id: string;
  timestamp: number;
  content: string;
};
