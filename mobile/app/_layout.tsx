import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0F4C35" },
          headerTintColor: "#F5C518",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0A3728" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ title: "Complete Profile", headerBackVisible: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="scheme/[id]"
          options={{ title: "Scheme Details", headerBackTitle: "Back" }}
        />
      </Stack>
    </>
  );
}
