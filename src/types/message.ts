export type Message = {
  type: 'text' | 'image';
  content: string;
  timestamp: number;
  peerId: string;
};

export type ConnectionState = {
  state: 'connected' | 'notConnected' | 'connecting';
  peerId: string;
};

export type PeerEvent = {
  peerId: string;
};

export type ConnectionStateEvent = {
  peerId: string;
  state: ConnectionState;
};
