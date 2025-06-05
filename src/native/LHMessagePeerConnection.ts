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
}

export interface ConnectionStateEvent {
    peerId: string;
    state: ConnectionState;
}

export interface PeerEvent {
    peerId: string;
}

const eventEmitter = new NativeEventEmitter(LHMessagePeerConnection);

export default {
    startAdvertising: (roomName: string): Promise<void> => {
        return LHMessagePeerConnection.startAdvertising(roomName);
    },
    startBrowsing: (roomName: string): Promise<void> => {
        return LHMessagePeerConnection.startBrowsing(roomName);
    },
    sendMessage: (message: string): Promise<void> => {
        return LHMessagePeerConnection.sendMessage(message);
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
