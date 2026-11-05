import '../global.css';

import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RouteGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'authenticated' && inAuthGroup) {
      router.replace('/');
    } else if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [status, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RouteGate />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
