import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";

export default function TabsLayout() {
  const { language } = useSessionStore();

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
            <Ionicons name="mic" size={size} color={color} />
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
