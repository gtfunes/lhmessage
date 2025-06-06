import { NativeModules, NativeEventEmitter } from 'react-native';
import type { Message, ConnectionState } from '../types/message';

const { LHMessagePeerConnection } = NativeModules;

class LHMessagePeerConnectionModule {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(LHMessagePeerConnection);
  }

  async startAdvertising(roomName: string): Promise<boolean> {
    return await LHMessagePeerConnection.startAdvertising(roomName);
  }

  async startBrowsing(roomName: string): Promise<boolean> {
    return await LHMessagePeerConnection.startBrowsing(roomName);
  }

  async sendMessage(message: string): Promise<boolean> {
    return await LHMessagePeerConnection.sendMessage(message);
  }

  async sendImage(base64Image: string): Promise<boolean> {
    return await LHMessagePeerConnection.sendImage(base64Image);
  }

  addPeerFoundListener(callback: (peerId: string) => void): void {
    this.eventEmitter.addListener('peerFound', (event) => {
      callback(event.peerId);
    });
  }

  addPeerLostListener(callback: (peerId: string) => void): void {
    this.eventEmitter.addListener('peerLost', (event) => {
      callback(event.peerId);
    });
  }

  addMessageReceivedListener(callback: (message: Message) => void): void {
    this.eventEmitter.addListener('messageReceived', (event) => {
      callback(event as Message);
    });
  }

  addConnectionStateChangedListener(callback: (state: ConnectionState) => void): void {
    this.eventEmitter.addListener('connectionStateChanged', (event) => {
      callback(event as ConnectionState);
    });
  }

  removeAllListeners(): void {
    this.eventEmitter.removeAllListeners('peerFound');
    this.eventEmitter.removeAllListeners('peerLost');
    this.eventEmitter.removeAllListeners('messageReceived');
    this.eventEmitter.removeAllListeners('connectionStateChanged');
  }
}

export default new LHMessagePeerConnectionModule();
