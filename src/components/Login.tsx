import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreenProps } from '../types/navigation';

const STORAGE_KEY = '@LHMessage:userData';

interface UserData {
  username: string;
  roomName: string;
  deviceId: string;
}

export const Login = ({ navigation }: LoginScreenProps) => {
  console.log('Login: Component rendering');

  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const { username: savedUsername, roomName: savedRoomName } = JSON.parse(savedData);
        setUsername(savedUsername);
        setRoomName(savedRoomName);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const handleLogin = async () => {
    console.log('Login: Attempting login with:', { username, roomName });

    if (!username.trim() || !roomName.trim()) {
      console.log('Login: Validation failed - empty fields');
      return;
    }

    try {
      const userData: UserData = {
        username: username.trim(),
        roomName: roomName.trim(),
        deviceId: 'test-device-id', // Temporary for testing
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

      console.log('Login: Navigating to Chat screen');
      navigation.replace('Chat', userData);
    } catch (error) {
      console.error('Login: Navigation error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join Chat Room</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Room Name"
          value={roomName}
          onChangeText={setRoomName}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
