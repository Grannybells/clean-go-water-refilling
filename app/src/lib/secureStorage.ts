import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const WEB_FALLBACK_PREFIX = '__secure__:';

const isWeb = Platform.OS === 'web';

async function webSet(key: string, value: string) {
  await AsyncStorage.setItem(WEB_FALLBACK_PREFIX + key, value);
}

async function webGet(key: string) {
  return AsyncStorage.getItem(WEB_FALLBACK_PREFIX + key);
}

async function webDelete(key: string) {
  await AsyncStorage.removeItem(WEB_FALLBACK_PREFIX + key);
}

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) return webSet(key, value);
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async getItem(key: string): Promise<string | null> {
    if (isWeb) return webGet(key);
    return SecureStore.getItemAsync(key);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) return webDelete(key);
    await SecureStore.deleteItemAsync(key);
  },
};
