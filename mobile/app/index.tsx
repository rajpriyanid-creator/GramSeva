import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from "react-native";
import { useRouter, useRootNavigationState } from "expo-router";
import { useSessionStore } from "@/store/session.store";
import { LANGUAGES } from "@/constants/languages";

export default function LanguageSelector() {
  const { setLanguage, isLoggedIn, user, language } = useSessionStore();
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  React.useEffect(() => {
    if (!rootNavigationState?.key) return;

    if (isLoggedIn && user && language) {
      const timer = setTimeout(() => {
        router.replace("/(tabs)/home");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user, language, rootNavigationState?.key]);

  const handleSelect = (lang: (typeof LANGUAGES)[0]) => {
    setSelected(lang.code);
    setLanguage(lang);
    // If already logged in, go straight to home
    if (isLoggedIn && user) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GramSeva</Text>
        <Text style={styles.subtitle}>ग्राम सेवा | கிராம சேவை</Text>
        <Text style={styles.tagline}>
          Your guide to government schemes{"\n"}
          सरकारी योजनाओं का आपका मार्गदर्शक
        </Text>
      </View>
      <Text style={styles.langLabel}>
        अपनी भाषा चुनें • Choose your language
      </Text>
      <FlatList
        data={LANGUAGES}
        numColumns={2}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.langCard,
              selected === item.code && styles.langCardSelected,
            ]}
            onPress={() => handleSelect(item)}
          >
            <Text style={styles.langFlag}>{item.flag}</Text>
            <Text style={styles.langName}>{item.nativeName}</Text>
            <Text style={styles.langEnglish}>{item.englishName}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F4C35" },
  header: { alignItems: "center", paddingTop: 40, paddingBottom: 24 },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#F5C518",
    letterSpacing: 2,
  },
  subtitle: { fontSize: 14, color: "#A8D5B5", marginTop: 4 },
  tagline: {
    fontSize: 13,
    color: "#c8e6c9",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  langLabel: {
    fontSize: 13,
    color: "#A8D5B5",
    textAlign: "center",
    marginBottom: 16,
  },
  grid: { paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
  langCard: {
    flex: 1,
    margin: 6,
    backgroundColor: "#1A5C42",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  langCardSelected: { borderColor: "#F5C518", backgroundColor: "#235D40" },
  langFlag: { fontSize: 32, marginBottom: 8 },
  langName: { fontSize: 20, fontWeight: "600", color: "#FFFFFF" },
  langEnglish: { fontSize: 12, color: "#A8D5B5", marginTop: 2 },
});
