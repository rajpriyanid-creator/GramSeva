import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";
import { TRANSLATIONS } from "@/constants/translations";

interface CSC {
  id: string;
  name: string;
  address: string;
  phone: string;
  timings: string;
  lat: number;
  lng: number;
  distance_km: number;
}

export default function CSCScreen() {
  const { profile, language } = useSessionStore();
  const [cscs, setCscs] = useState<CSC[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const activeLang = language?.code || "en-IN";
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS["en-IN"];

  useEffect(() => {
    fetchNearbyCSCs();
  }, []);

  const fetchNearbyCSCs = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Fallback: use state from profile
        const state = profile?.state || "TN";
        const data = await ApiService.getNearbyCSCs({
          lat: 11.0168,
          lng: 78.1460,
          state,
        });
        setCscs(data.cscs || []);
        return;
      }

      setLocationGranted(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const data = await ApiService.getNearbyCSCs({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        state: profile?.state || "TN",
      });
      setCscs(data.cscs || []);
    } catch (err) {
      Alert.alert("Error", t.cscNone || "Could not fetch nearby CSCs.");
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (csc: CSC) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${csc.lat},${csc.lng}`;
    Linking.openURL(url);
  };

  const callCSC = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.cscTitle}</Text>
        <Text style={styles.headerSubtitle}>
          {t.cscSub}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#F5C518" />
        <Text style={styles.infoText}>
          {t.cscHelp}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C518" />
          <Text style={styles.loadingText}>{t.cscFinding}</Text>
        </View>
      ) : (
        <FlatList
          data={cscs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={12} color="#F5C518" />
                  <Text style={styles.distanceText}>{item.distance_km} km</Text>
                </View>
              </View>

              <Text style={styles.cscName}>{item.name}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color="#A8D5B5" />
                <Text style={styles.cscAddress}>{item.address}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="time-outline" size={14} color="#A8D5B5" />
                <Text style={styles.cscTimings}>{item.timings}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => callCSC(item.phone)}
                >
                  <Ionicons name="call" size={16} color="#0A3728" />
                  <Text style={styles.callText}>{t.cscCall}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mapsButton}
                  onPress={() => openMaps(item)}
                >
                  <Ionicons name="map" size={16} color="#0A3728" />
                  <Text style={styles.mapsText}>{t.cscDirections}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color="#A8D5B5" />
              <Text style={styles.emptyText}>{t.cscNone}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchNearbyCSCs}
              >
                <Text style={styles.retryText}>{t.cscRetry}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#F5C518" },
  headerSubtitle: { fontSize: 13, color: "#A8D5B5", marginTop: 2 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A5C42",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 10,
  },
  infoText: { fontSize: 13, color: "#c8e6c9", flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { color: "#A8D5B5", fontSize: 15 },
  list: { padding: 16, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: "#1A5C42",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  cardHeader: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0A3728",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  distanceText: { color: "#F5C518", fontSize: 12, fontWeight: "600" },
  cscName: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 4 },
  cscAddress: { fontSize: 13, color: "#c8e6c9", flex: 1 },
  cscTimings: { fontSize: 13, color: "#A8D5B5" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  callButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#A8D5B5",
    borderRadius: 20,
    paddingVertical: 10,
  },
  callText: { fontSize: 14, fontWeight: "600", color: "#0A3728" },
  mapsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F5C518",
    borderRadius: 20,
    paddingVertical: 10,
  },
  mapsText: { fontSize: 14, fontWeight: "600", color: "#0A3728" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 16 },
  emptyText: { fontSize: 16, color: "#A8D5B5" },
  retryButton: {
    backgroundColor: "#1A5C42",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#F5C518", fontWeight: "600" },
});
