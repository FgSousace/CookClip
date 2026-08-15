import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAppTheme } from '@/hooks/use-app-theme';
import { RecipeStoreProvider } from '@/store/recipe-store';

function RootNavigator() {
  const { colors, scheme } = useAppTheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="storage" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <RecipeStoreProvider>
      <RootNavigator />
    </RecipeStoreProvider>
  );
}
