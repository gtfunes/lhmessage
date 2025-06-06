import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Login } from '../src/components/Login';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

const mockNavigate = jest.fn();
const defaultProps = {
  navigation: { navigate: mockNavigate } as any,
  route: {
    key: 'mock-key',
    name: 'Login',
    params: {},
  } as any,
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<Login {...defaultProps} />);
    expect(getByText('Join Chat Room')).toBeTruthy();
    expect(getByPlaceholderText('Username')).toBeTruthy();
    expect(getByPlaceholderText('Room Name')).toBeTruthy();
    expect(getByText('Join Room')).toBeTruthy();
  });

  it('loads saved data from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ username: 'savedUser', roomName: 'savedRoom' })
    );
    const { getByDisplayValue } = render(<Login {...defaultProps} />);
    await act(async () => {}); // Let useEffect finish
    expect(getByDisplayValue('savedUser')).toBeTruthy();
    expect(getByDisplayValue('savedRoom')).toBeTruthy();
  });

  it('does not navigate or save if fields are empty', async () => {
    const { getByText } = render(<Login {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByText('Join Room'));
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('saves data and navigates on valid input', async () => {
    const { getByPlaceholderText, getByText } = render(<Login {...defaultProps} />);
    fireEvent.changeText(getByPlaceholderText('Username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Room Name'), 'testroom');
    fireEvent.press(getByText('Join Room'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@LHMessage:userData',
        expect.stringContaining('testuser')
      );
      expect(mockNavigate).toHaveBeenCalledWith('Chat', expect.objectContaining({
        username: 'testuser',
        roomName: 'testroom',
        deviceId: expect.any(String),
      }));
    });
  });
});
