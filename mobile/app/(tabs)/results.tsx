import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { useSchemesStore } from "@/store/schemes.store";
import { ApiService } from "@/services/api.service";
import SchemeCard from "@/components/SchemeCard";

export default function ResultsScreen() {
  const { language, user } = useSessionStore();
  const { matchedSchemes, setMatchedSchemes } = useSchemesStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibleSchemes = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getEligibleSchemes(user.id);
      if (data && data.schemes) {
        setMatchedSchemes(data.schemes);
      }
    } catch (err: any) {
      console.warn("Failed to fetch eligible schemes:", err);
      setError("Could not load eligible schemes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleSchemes();
  }, [user?.id]);

  const activeLang = language?.code || "en-IN";

  // Localized texts
  const t = {
    emptyTitle: activeLang === "ta-IN" ? "முடிவுகள் இன்னும் இல்லை" : activeLang === "hi-IN" ? "अभी तक कोई परिणाम नहीं" : "No results yet",
    emptyText: activeLang === "ta-IN" 
      ? "திட்டங்களைக் கண்டறிய உங்கள் சுயவிவரத்தைப் பூர்த்தி செய்யவும் அல்லது முகப்புப் பக்கத்தில் வாய்ஸ் தேடலைத் தொடங்கவும்." 
      : activeLang === "hi-IN" 
      ? "आप किन योजनाओं के लिए पात्र हैं, यह देखने के लिए प्रोफ़ाइल पूरी करें या होम टैब पर वॉइस खोज शुरू करें।" 
      : "Complete your profile or start the voice questionnaire on the Home tab to see which schemes you qualify for.",
    btnText: activeLang === "ta-IN" ? "வாய்ஸ் தேடலைத் தொடங்கு" : activeLang === "hi-IN" ? "वॉइस खोज शुरू करें" : "Start Voice Query",
    qualifyText: activeLang === "ta-IN" ? "திட்டங்களுக்கு நீங்கள் தகுதியுடையவர்" : activeLang === "hi-IN" ? "योजनाएं जिनके लिए आप पात्र हैं" : "schemes you qualify for",
    loadingText: activeLang === "ta-IN" ? "பொருத்தமான திட்டங்களை தேடுகிறது..." : activeLang === "hi-IN" ? "पात्र योजनाओं की खोज जारी है..." : "Checking eligibility...",
    refreshText: activeLang === "ta-IN" ? "புதுப்பி" : activeLang === "hi-IN" ? "तरोताजा करें" : "Refresh",
  };

  if (loading && matchedSchemes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F5C518" />
          <Text style={styles.loadingText}>{t.loadingText}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (matchedSchemes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles" size={64} color="#F5C518" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
          <TouchableOpacity
            style={styles.goHomeButton}
            onPress={() => router.push("/(tabs)/home")}
          >
            <Ionicons name="mic" size={18} color="#0A3728" />
            <Text style={styles.goHomeText}>{t.btnText}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {user && (
        <View style={styles.profileBanner}>
          <View style={styles.profileItem}>
            <Ionicons name="person" size={14} color="#F5C518" />
            <Text style={styles.profileText}>{activeLang === "ta-IN" ? "வயது" : activeLang === "hi-IN" ? "उम्र" : "Age"} {user.age || "N/A"}</Text>
          </View>
          <View style={styles.profileItem}>
            <Ionicons name="location" size={14} color="#F5C518" />
            <Text style={styles.profileText}>{user.state || "ALL"}</Text>
          </View>
          <View style={styles.profileItem}>
            <Ionicons name="briefcase" size={14} color="#F5C518" />
            <Text style={styles.profileText}>{user.occupation || "N/A"}</Text>
          </View>
          <TouchableOpacity onPress={fetchEligibleSchemes} disabled={loading} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={16} color="#F5C518" />
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={matchedSchemes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerText}>
              {matchedSchemes.length} {t.qualifyText}
            </Text>
            {loading && <ActivityIndicator size="small" color="#F5C518" />}
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "#A8D5B5",
    fontSize: 14,
  },
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A5C42",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  profileItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileText: { fontSize: 13, color: "#FFFFFF", fontWeight: "500" },
  refreshBtn: {
    padding: 4,
  },
  errorBox: {
    backgroundColor: "#7F1D1D",
    padding: 10,
    alignItems: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: {
    color: "#F5C518",
    fontSize: 16,
    fontWeight: "600",
  },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
});
