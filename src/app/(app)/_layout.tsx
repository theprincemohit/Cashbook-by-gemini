import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  // Don't redirect while still loading the auth state
  if (isLoading) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E1A' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create-business"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-detail"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="create-passbook"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="transaction-form"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="passbook-detail"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
