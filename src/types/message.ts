export type MessageType = 'text' | 'image';

export interface Message {
  type: MessageType;
  content: string;
  timestamp: number;
  peerId: string;
}

export interface ConnectionState {
  peerId: string;
  state: 'connected' | 'connecting' | 'disconnected';
}
