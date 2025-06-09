import { NativeModules, NativeEventEmitter } from 'react-native';

const { LHMessagePeerConnection } = NativeModules;

if (!LHMessagePeerConnection) {
    throw new Error('LHMessagePeerConnection native module is not available');
}

export enum ConnectionState {
    Connected = 'connected',
    NotConnected = 'notConnected'
}

export interface MessageEvent {
    peerId: string;
    message: string;
    type: 'text' | 'image';
    timestamp?: number;
}

export interface ConnectionStateEvent {
    peerId: string;
    state: ConnectionState;
}

export interface PeerEvent {
    peerId: string;
    displayName: string;
}

const eventEmitter = new NativeEventEmitter(LHMessagePeerConnection);

export default {
    startAdvertising: (roomName: string): Promise<boolean> => {
        return LHMessagePeerConnection.startAdvertising(roomName);
    },
    startBrowsing: (roomName: string): Promise<boolean> => {
        return LHMessagePeerConnection.startBrowsing(roomName);
    },
    sendMessage: (message: string): Promise<void> => {
        return LHMessagePeerConnection.sendMessage(message);
    },
    sendImage: (base64Image: string): Promise<void> => {
        return LHMessagePeerConnection.sendImage(base64Image);
    },
    addPeerFoundListener: (callback: (event: PeerEvent) => void) => {
        return eventEmitter.addListener('peerFound', callback);
    },
    addPeerLostListener: (callback: (event: PeerEvent) => void) => {
        return eventEmitter.addListener('peerLost', callback);
    },
    addMessageReceivedListener: (callback: (event: MessageEvent) => void) => {
        return eventEmitter.addListener('messageReceived', callback);
    },
    addConnectionStateChangedListener: (callback: (event: ConnectionStateEvent) => void) => {
        return eventEmitter.addListener('connectionStateChanged', callback);
    },
};
