import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { useSchemesStore } from "@/store/schemes.store";
import { ApiService } from "@/services/api.service";
import SchemeCard from "@/components/SchemeCard";
import { getTranslatedSchemeName } from "@/constants/schemeTranslations";

const TYPES = ["All", "Direct Benefit Transfer", "Health Insurance", "Subsidy", "Scholarship", "Employment Guarantee", "Savings Scheme"];

export default function SchemesScreen() {
  const { language } = useSessionStore();
  const { allSchemes, setAllSchemes } = useSchemesStore();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    if (allSchemes.length === 0) fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAllSchemes();
      setAllSchemes(data.schemes);
    } catch {
      // show cached if available
    } finally {
      setLoading(false);
    }
  };

  const filtered = allSchemes.filter((s) => {
    const localizedName = getTranslatedSchemeName(s, language?.code || "en-IN");
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      localizedName.toLowerCase().includes(search.toLowerCase()) ||
      (s.benefit || "").toLowerCase().includes(search.toLowerCase());
    const matchType = selectedType === "All" || s.type === selectedType;
    return matchSearch && matchType;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#A8D5B5" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search schemes..."
          placeholderTextColor="#A8D5B5"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#A8D5B5" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(t) => t}
        style={styles.filterBar}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === item && styles.filterChipActive,
            ]}
            onPress={() => setSelectedType(item)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === item && styles.filterChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C518" />
          <Text style={styles.loadingText}>Loading schemes...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SchemeCard scheme={item} language={language} />
          )}
          ListHeaderComponent={
            <Text style={styles.count}>{filtered.length} schemes</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#A8D5B5" />
              <Text style={styles.emptyText}>No schemes found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  filterBar: {
    flexGrow: 0,
    maxHeight: 50,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5C42",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 15, paddingVertical: 12 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: {
    backgroundColor: "#1A5C42",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: { borderColor: "#F5C518", backgroundColor: "#235D40" },
  filterChipText: { color: "#A8D5B5", fontSize: 13 },
  filterChipTextActive: { color: "#F5C518", fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { color: "#A8D5B5", fontSize: 15 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  count: {
    color: "#A8D5B5",
    fontSize: 13,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { color: "#A8D5B5", fontSize: 16 },
});
