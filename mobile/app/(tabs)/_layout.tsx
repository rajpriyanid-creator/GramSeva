import { useEffect } from "react";
import { Tabs, useRouter, useRootNavigationState } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert, TouchableOpacity } from "react-native";
import { useSessionStore } from "@/store/session.store";

export default function TabsLayout() {
  const { language, user, token, logout } = useSessionStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    // If the user has logged in but their profile is not complete,
    // force them to complete their details first.
    if (token && user && user.profileComplete === false) {
      const timer = setTimeout(() => {
        Alert.alert(
          "Complete Your Profile",
          "Please complete your profile details first to browse and apply for schemes."
        );
        router.replace("/profile-setup");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, token, rootNavigationState?.key]);

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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Logout", "Are you sure you want to logout?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: () => {
                      logout();
                      router.replace("/login");
                    },
                  },
                ]);
              }}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#F5C518" />
            </TouchableOpacity>
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
        name="csc"
        options={{
          title: "Service Centres",
          tabBarLabel: "CSC",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
