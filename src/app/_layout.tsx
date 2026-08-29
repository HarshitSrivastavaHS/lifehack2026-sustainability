import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Palette } from '@/constants/theme';
import { AppProvider } from '@/state/app-context';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') document.title = 'CommonGrid';
  }, []);
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.cream } }} />
    </AppProvider>
  );
}
