import { Platform } from 'react-native';

const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEV_API_URL;

export const STORAGE_KEYS = {
  authToken: 'auth.token',
  authUser: 'auth.user',
  authModules: 'auth.modules',
  settings: 'settings',
} as const;
