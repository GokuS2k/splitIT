import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user } = useAuth();
  const segments = useSegments();

  // Declarative redirect — safe to use inside the layout tree.
  // This runs after the navigator mounts, avoiding the blank-screen crash
  // caused by imperative router.replace() firing before the Stack is ready.
  const onLoginScreen = segments[0] === 'login';

  if (user && onLoginScreen) {
    return <Redirect href="/(tabs)" />;
  }

  if (!user && !onLoginScreen) {
    return <Redirect href="/login" />;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-expense"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

