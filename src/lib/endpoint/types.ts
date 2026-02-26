export type PersonProtocolEvent = "FriendRequest" | "ChatRequest";

export type Person = {
  name: string;
  avatar?: Uint8Array;
  bio: string;
};

export type RelayConfig = {
  url: string;
  quic_port: number;
};
