import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";

interface Application {
  id: string;
  schemeName: string;
  schemeMinistry: string;
  schemeType: string;
  schemeBenefit: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  remarks?: string;
}

const STATUS_COLOR = { pending: "#F5C518", approved: "#4CAF50", rejected: "#F44336" };
const STATUS_ICON = { pending: "time-outline", approved: "checkmark-circle", rejected: "close-circle" };

export default function ApplicationsTab() {
  const { user, isLoggedIn } = useSessionStore();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    try {
      const res = await ApiService.getUserApplications(user.id);
      setApps(res.applications || []);
    } catch {
      Alert.alert("Error", "Could not load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Ionicons name="lock-closed-outline" size={64} color="#A8D5B5" />
          <Text style={s.emptyTitle}>Login Required</Text>
          <Text style={s.emptyText}>Login to view your scheme applications</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push("/login")}>
            <Text style={s.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* User ID Header */}
      <View style={s.idBar}>
        <Ionicons name="id-card-outline" size={16} color="#F5C518" />
        <Text style={s.idText}>{user?.gramsevaId || user?.name}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={s.profileBtn} onPress={() => router.push("/profile-setup")}>
          <Ionicons name="person-circle-outline" size={20} color="#A8D5B5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#F5C518" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5C518" />}
        >
          <Text style={s.sectionTitle}>My Applications ({apps.length})</Text>

          {apps.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="document-outline" size={48} color="#A8D5B5" />
              <Text style={s.emptyTitle}>No Applications Yet</Text>
              <Text style={s.emptyText}>Find eligible schemes from the Home tab and apply in seconds.</Text>
              <TouchableOpacity style={s.loginBtn} onPress={() => router.replace("/(tabs)/home")}>
                <Text style={s.loginBtnText}>Find Schemes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            apps.map(app => (
              <View key={app.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[app.status] + "22" }]}>
                    <Ionicons name={STATUS_ICON[app.status] as any} size={14} color={STATUS_COLOR[app.status]} />
                    <Text style={[s.statusText, { color: STATUS_COLOR[app.status] }]}>
                      {app.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.date}>{new Date(app.submittedAt).toLocaleDateString("en-IN")}</Text>
                </View>

                <Text style={s.schemeName}>{app.schemeName}</Text>
                <Text style={s.ministry}>{app.schemeMinistry}</Text>

                <View style={s.row}>
                  <View style={s.tag}>
                    <Ionicons name="pricetag-outline" size={11} color="#A8D5B5" />
                    <Text style={s.tagText}>{app.schemeType}</Text>
                  </View>
                  <Text style={s.appId}>{app.id}</Text>
                </View>

                {app.schemeBenefit && (
                  <Text style={s.benefit} numberOfLines={2}>💰 {app.schemeBenefit}</Text>
                )}

                {app.remarks ? (
                  <View style={[s.remarksBox, { borderColor: STATUS_COLOR[app.status] + "55" }]}>
                    <Text style={s.remarksLabel}>Admin Remarks:</Text>
                    <Text style={s.remarks}>{app.remarks}</Text>
                  </View>
                ) : null}

                {app.reviewedAt && (
                  <Text style={s.reviewDate}>
                    Reviewed: {new Date(app.reviewedAt).toLocaleDateString("en-IN")}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  idBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#112e20", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#1e4d35",
  },
  idText: { color: "#F5C518", fontWeight: "700", fontFamily: "monospace", fontSize: 13 },
  profileBtn: { padding: 4 },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#F5C518", marginBottom: 16 },
  card: {
    backgroundColor: "#112e20", borderRadius: 20, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: "#1e4d35",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 11, color: "#A8D5B5" },
  schemeName: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginBottom: 3 },
  ministry: { fontSize: 12, color: "#A8D5B5", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0A3728", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: "#A8D5B5" },
  appId: { fontSize: 10, color: "#5a8a6a", fontFamily: "monospace" },
  benefit: { fontSize: 12, color: "#c8e6c9", lineHeight: 18, marginTop: 4 },
  remarksBox: { marginTop: 10, backgroundColor: "#0A3728", borderRadius: 10, padding: 10, borderWidth: 1 },
  remarksLabel: { fontSize: 11, color: "#A8D5B5", fontWeight: "700", marginBottom: 3 },
  remarks: { fontSize: 13, color: "#FFFFFF" },
  reviewDate: { fontSize: 11, color: "#5a8a6a", marginTop: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  emptyBox: { alignItems: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, color: "#A8D5B5", textAlign: "center", lineHeight: 22 },
  loginBtn: { backgroundColor: "#F5C518", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#0A3728" },
});
