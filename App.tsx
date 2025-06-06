import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Login } from './src/components/Login';
import { ChatScreen } from './src/screens/ChatScreen';
import { RootStackParamList } from './src/types/navigation';
import { View, Text, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text>Something went wrong. Please restart the app.</Text>
          <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  try {
    return (
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
              animation: 'default',
            }}
          >
            <Stack.Screen
              name="Login"
              component={Login}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App: Error during initialization:', error);
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to initialize app. Please restart.</Text>
        <Text style={styles.errorText}>{error?.toString()}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    color: 'red',
  },
});
