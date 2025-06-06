// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Improved GiftedChat mock: renders messages as <Text> for test queries
jest.mock('react-native-gifted-chat', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const GiftedChat = ({ messages }) => (
    <>
      {messages && messages.map((msg) => (
        <Text key={msg._id}>{msg.text || (msg.image ? '📷 Image' : '')}</Text>
      ))}
    </>
  );
  GiftedChat.append = (prev, next) => [...prev, ...next];
  return {
    GiftedChat,
    Send: ({ children }) => <>{children}</>,
    Actions: ({ children }) => <>{children}</>,
    IMessage: {},
    SendProps: {},
    ActionsProps: {},
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

// Mock the native module
jest.mock('./src/native/LHMessagePeerConnection', () => ({
  startAdvertising: jest.fn(),
  startBrowsing: jest.fn(),
  sendMessage: jest.fn(),
  sendImage: jest.fn(),
  addPeerFoundListener: jest.fn(() => ({ remove: jest.fn() })),
  addPeerLostListener: jest.fn(() => ({ remove: jest.fn() })),
  addMessageReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addConnectionStateChangedListener: jest.fn(() => ({ remove: jest.fn() })),
  ConnectionState: {
    Connected: 'connected',
    NotConnected: 'not_connected',
  },
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock @react-navigation/native-stack
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));
