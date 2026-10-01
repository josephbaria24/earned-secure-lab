import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_700Bold,
} from '@expo-google-fonts/libre-baskerville';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { ToastProviderWithViewport } from '@/components/toast';
import { AuthProvider } from '@/context/AuthContext';
import colors from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const appBackground = colors.light.background;

function statusBarStyleFor(background: string): 'light' | 'dark' {
  const raw = background.replace('#', '');
  const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? 'dark' : 'light';
}

function RootLayoutNav() {
  const barStyle = statusBarStyleFor(appBackground);
  return (
    <>
      <StatusBar style={barStyle} backgroundColor={appBackground} translucent />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: appBackground },
          statusBarStyle: barStyle,
          statusBarBackgroundColor: appBackground,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    LibreBaskerville_400Regular,
    LibreBaskerville_700Bold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(appBackground);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: appBackground }}>
            <KeyboardProvider>
              <ToastProviderWithViewport>
                <AuthProvider><RootLayoutNav /></AuthProvider>
              </ToastProviderWithViewport>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
