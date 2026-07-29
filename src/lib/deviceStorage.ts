import * as SecureStore from 'expo-secure-store';

const DEVICE_TOKEN_KEY = 'device_token';
const DEVICE_ID_KEY = 'device_id';

export const deviceStorage = {
  getToken: async (): Promise<string | null> => SecureStore.getItemAsync(DEVICE_TOKEN_KEY),
  setToken: async (token: string): Promise<void> => SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token),
  clearToken: async (): Promise<void> => SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY),

  getDeviceId: async (): Promise<string | null> => SecureStore.getItemAsync(DEVICE_ID_KEY),
  setDeviceId: async (id: string): Promise<void> => SecureStore.setItemAsync(DEVICE_ID_KEY, id),
  clearDeviceId: async (): Promise<void> => SecureStore.deleteItemAsync(DEVICE_ID_KEY),
};