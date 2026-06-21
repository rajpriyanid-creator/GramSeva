import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { useSessionStore } from "@/store/session.store";

export default function TabsLayout() {
  const { language, user, token } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    // If the user has logged in but their profile is not complete,
    // force them to complete their details first.
    if (token && user && user.profileComplete === false) {
      Alert.alert(
        "Complete Your Profile",
        "Please complete your profile details first to browse and apply for schemes."
      );
      router.replace("/profile-setup");
    }
  }, [user, token]);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0F4C35",
          borderTopColor: "#1A5C42",
        },
        tabBarActiveTintColor: "#F5C518",
        tabBarInactiveTintColor: "#A8D5B5",
        headerStyle: { backgroundColor: "#0F4C35" },
        headerTintColor: "#F5C518",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "GramSeva",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schemes"
        options={{
          title: "All Schemes",
          tabBarLabel: "Schemes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Chat Assistant",
          tabBarLabel: "AI Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "My Results",
          tabBarLabel: "Results",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "My Applications",
          tabBarLabel: "Applied",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
