import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { useSchemesStore } from "@/store/schemes.store";
import SchemeCard from "@/components/SchemeCard";

export default function ResultsScreen() {
  const { language, profile } = useSessionStore();
  const { matchedSchemes } = useSchemesStore();

  if (matchedSchemes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-circle" size={64} color="#1A5C42" />
          <Text style={styles.emptyTitle}>No results yet</Text>
          <Text style={styles.emptyText}>
            Complete the voice questionnaire on the Home tab to see which
            government schemes you qualify for.
          </Text>
          <TouchableOpacity
            style={styles.goHomeButton}
            onPress={() => router.push("/(tabs)/home")}
          >
            <Ionicons name="mic" size={18} color="#0A3728" />
            <Text style={styles.goHomeText}>Start Voice Query</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {profile && (
        <View style={styles.profileBanner}>
          <View style={styles.profileItem}>
            <Ionicons name="person" size={14} color="#F5C518" />
            <Text style={styles.profileText}>Age {profile.age}</Text>
          </View>
          <View style={styles.profileItem}>
            <Ionicons name="location" size={14} color="#F5C518" />
            <Text style={styles.profileText}>{profile.state}</Text>
          </View>
          <View style={styles.profileItem}>
            <Ionicons name="briefcase" size={14} color="#F5C518" />
            <Text style={styles.profileText}>{profile.occupation}</Text>
          </View>
        </View>
      )}
      <FlatList
        data={matchedSchemes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.headerText}>
            {matchedSchemes.length} schemes you qualify for
          </Text>
        }
        renderItem={({ item }) => (
          <SchemeCard scheme={item} language={language} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  emptyText: {
    fontSize: 15,
    color: "#A8D5B5",
    textAlign: "center",
    lineHeight: 22,
  },
  goHomeButton: {
    marginTop: 8,
    backgroundColor: "#F5C518",
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goHomeText: { fontSize: 16, fontWeight: "700", color: "#0A3728" },
  profileBanner: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1A5C42",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  profileItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileText: { fontSize: 13, color: "#FFFFFF" },
  headerText: {
    color: "#F5C518",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
});
