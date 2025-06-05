import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Chat: {
    username: string;
    deviceId: string;
    roomName: string;
  };
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'Chat'>;
