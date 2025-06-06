import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Text, Image } from 'react-native';
import { GiftedChat, IMessage, Send, Actions, SendProps, ActionsProps, MessageImageProps } from 'react-native-gifted-chat';
import { ChatScreenProps } from '../types/navigation';
import LHMessagePeerConnection, { ConnectionState, MessageEvent } from '../native/LHMessagePeerConnection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';

export const Chat = ({ route, navigation }: ChatScreenProps) => {
  const insets = useSafeAreaInsets();
  const { username, deviceId, roomName } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: `Room: ${roomName}`,
      headerShown: true,
      headerBackVisible: true,
      headerBackTitle: 'Back',
      gestureEnabled: true,
    });
  }, [navigation, roomName]);

  const cameraButton = useCallback(() => <Icon name="camera" size={20} color="#007AFF" />, []);

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

      const messageSubscription = LHMessagePeerConnection.addMessageReceivedListener(({ peerId, message, type }: MessageEvent) => {
        console.log('Message received from:', peerId);
        const newMessage: IMessage = {
          _id: `${Date.now()}-${peerId}`,
          text: type === 'text' ? message : '📷 Image',
          createdAt: new Date(),
          user: {
            _id: peerId,
            name: peerId,
          },
          ...(type === 'image' && { image: message }),
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

  const handleImagePick = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
      });

      if (result.assets && result.assets[0]?.base64) {
        setIsLoading(true);
        try {
          await LHMessagePeerConnection.sendImage(result.assets[0].base64);

          const newMessage: IMessage = {
            _id: `${Date.now()}-${deviceId}`,
            text: '📷 Image',
            createdAt: new Date(),
            user: {
              _id: deviceId,
              name: username,
            },
            image: `data:image/jpeg;base64,${result.assets[0].base64}`,
          };
          setMessages(previousMessages => GiftedChat.append(previousMessages, [newMessage]));
        } catch (error) {
          console.error('Error sending image:', error);
          Alert.alert('Error', 'Failed to send image');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [deviceId, username]);

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

  const renderActions = useCallback((props: ActionsProps) => {
    return (
      <Actions
        {...props}
        containerStyle={styles.actionsContainer}
        icon={() => cameraButton()}
        onPressActionButton={handleImagePick}
        options={{
          'Choose Image': handleImagePick,
        }}
      />
    );
  }, [cameraButton, handleImagePick]);

  const renderSend = useCallback((props: SendProps<IMessage>) => {
    return (
      <Send
        {...props}
        disabled={isLoading}
        containerStyle={styles.sendContainer}
      >
        <Icon name="paper-plane" size={20} color="#007AFF" disabled={isLoading} />
      </Send>
    );
  }, [isLoading]);

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
          renderActions={renderActions}
          renderSend={renderSend}
          renderMessageImage={(props: MessageImageProps<IMessage>) => (
            <Image
              {...props}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
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
  actionsContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    margin: 3,
  },
});
