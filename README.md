# LHMessage - Offline Chat App

LHMessage is a vibe-coded React Native chat application that works 100% offline using local wireless communication. It uses Multipeer Connectivity on iOS and Nearby Connections on Android to enable device-to-device communication without requiring an internet connection.

## Features

- Real-time chat between nearby devices
- Works completely offline
- Automatic peer discovery
- Message persistence using AsyncStorage
- Modern chat UI using react-native-gifted-chat

## Prerequisites

- Node.js >= 18.18.0
- React Native development environment set up
- iOS: Xcode and CocoaPods
- Android: Android Studio and Android SDK

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. For iOS, install CocoaPods:

   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

## How it Works

The app uses native wireless communication technologies to enable device-to-device chat:

- **iOS**: Uses Multipeer Connectivity framework
- **Android**: Uses Google Play Services Nearby Connections API

When you launch the app, it will:

1. Start advertising its presence to nearby devices
2. Start browsing for other devices running the app
3. Automatically connect to discovered peers
4. Enable real-time chat between connected devices

## Permissions

The app requires the following permissions:

### iOS

- Bluetooth
- Local Network

### Android

- Bluetooth
- Location
- Nearby Devices

## Development

### Project Structure

- `src/components/Chat.tsx`: Main chat component
- `src/native/LHMessagePeerConnection.ts`: JavaScript interface for native modules
- `ios/LHMessage/LHMessagePeerConnection.*`: iOS native implementation
- `android/app/src/main/java/com/lhmessage/LHMessagePeerConnection*`: Android native implementation

### Adding Features

To add new features:

1. Update the native modules if needed
2. Update the JavaScript interface
3. Modify the Chat component to use new functionality

## License

MIT
