import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { ChatScreenProps } from '../types/navigation';
import LHMessagePeerConnection, { ConnectionState, MessageEvent } from '../native/LHMessagePeerConnection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Chat = ({ route, navigation }: ChatScreenProps) => {
  const insets = useSafeAreaInsets();
  const { username, deviceId, roomName } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: `Room: ${roomName}`,
      headerShown: true,
      headerBackVisible: true,
      headerBackTitle: 'Back',
      gestureEnabled: true,
    });
  }, [navigation, roomName]);

  const setupPeerConnection = useCallback(() => {
    try {
      LHMessagePeerConnection.startAdvertising(roomName);
      LHMessagePeerConnection.startBrowsing(roomName);

      const peerFoundSubscription = LHMessagePeerConnection.addPeerFoundListener(({ peerId }) => {
        console.log('Peer found:', peerId);
      });

      const peerLostSubscription = LHMessagePeerConnection.addPeerLostListener(({ peerId }) => {
        console.log('Peer lost:', peerId);
        setConnectedPeers(prev => prev.filter(p => p !== peerId));
      });

      const messageSubscription = LHMessagePeerConnection.addMessageReceivedListener(({ peerId, message }: MessageEvent) => {
        console.log('Message received from:', peerId);
        const newMessage: IMessage = {
          _id: `${Date.now()}-${peerId}`,
          text: message,
          createdAt: new Date(),
          user: {
            _id: peerId,
            name: peerId,
          },
        };
        setMessages(prev => GiftedChat.append(prev, [newMessage]));
      });

      const connectionSubscription = LHMessagePeerConnection.addConnectionStateChangedListener(({ peerId, state }) => {
        console.log('Connection state changed:', peerId, state);
        if (state === ConnectionState.Connected) {
          setConnectedPeers(prev => [...prev, peerId]);
        } else if (state === ConnectionState.NotConnected) {
          setConnectedPeers(prev => prev.filter(p => p !== peerId));
        }
      });

      return () => {
        peerFoundSubscription.remove();
        peerLostSubscription.remove();
        messageSubscription.remove();
        connectionSubscription.remove();
      };
    } catch (error) {
      console.error('Error setting up peer connection:', error);
      Alert.alert('Error', 'Failed to start chat session');
    }
  }, [roomName]);

  useEffect(() => {
    const cleanup = setupPeerConnection();
    return () => {
      cleanup?.();
    };
  }, [setupPeerConnection]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    try {
      const message = newMessages[0];
      if (!message) {return;}

      const formattedMessage: IMessage = {
        _id: `${Date.now()}-${deviceId}`,
        text: message.text,
        createdAt: new Date(),
        user: {
          _id: deviceId,
          name: username,
        },
      };

      LHMessagePeerConnection.sendMessage(message.text);
      setMessages(previousMessages => GiftedChat.append(previousMessages, [formattedMessage]));
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  }, [deviceId, username]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.peerCount}>
          Connected Peers: {connectedPeers.length}
        </Text>
      </View>
      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{
            _id: deviceId,
            name: username,
          }}
          alwaysShowSend
          scrollToBottom
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  peerCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
});
