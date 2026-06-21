import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";

interface Props {
  scheme: {
    id: string;
    name: string;
    name_ta?: string; name_hi?: string; name_te?: string;
    name_kn?: string; name_mr?: string; name_bn?: string;
    benefit: string; ministry: string; type: string; url: string;
    department: { helpline: string; name: string };
  };
  language: { code: string } | null;
}

export default function SchemeCard({ scheme, language }: Props) {
  const { user, isLoggedIn } = useSessionStore();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const localName =
    language?.code === "ta-IN" ? scheme.name_ta :
    language?.code === "hi-IN" ? scheme.name_hi :
    language?.code === "te-IN" ? scheme.name_te :
    language?.code === "kn-IN" ? scheme.name_kn :
    language?.code === "mr-IN" ? scheme.name_mr :
    language?.code === "bn-IN" ? scheme.name_bn : null;

  const handleApply = async () => {
    if (!isLoggedIn || !user?.id) {
      Alert.alert(
        "Login Required",
        "Please login to apply for schemes through the app.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login") }
        ]
      );
      return;
    }

    if (!user.profileComplete) {
      Alert.alert(
        "Complete Profile",
        "Please complete your profile to apply for schemes. We need your details to process the application.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Complete Profile", onPress: () => router.push("/profile-setup") }
        ]
      );
      return;
    }

    Alert.alert(
      "Apply for Scheme",
      `Apply for "${scheme.name}"?\n\nYour registered profile details will be submitted. You can track the status in My Applications tab.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply Now",
          onPress: async () => {
            setApplying(true);
            try {
              await ApiService.applyForScheme(user.id, scheme.id);
              setApplied(true);
              Alert.alert("✅ Applied!", `Your application for "${scheme.name}" has been submitted. Track it in My Applications tab.`);
            } catch (err: any) {
              const msg = err?.response?.data?.error || "Could not submit application";
              if (msg.includes("Already applied")) {
                setApplied(true);
                Alert.alert("Already Applied", "You have already applied for this scheme.");
              } else {
                Alert.alert("Error", msg);
              }
            } finally {
              setApplying(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/scheme/${scheme.id}`)}>
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{scheme.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#F5C518" />
      </View>

      <Text style={styles.name}>{localName || scheme.name}</Text>
      {localName && localName !== scheme.name && (
        <Text style={styles.englishName}>{scheme.name}</Text>
      )}

      <View style={styles.benefitRow}>
        <Ionicons name="cash-outline" size={16} color="#4CAF50" />
        <Text style={styles.benefit}>{scheme.benefit}</Text>
      </View>
      <Text style={styles.ministry}>{scheme.ministry}</Text>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:${scheme.department?.helpline}`)}
        >
          <Ionicons name="call" size={14} color="#0A3728" />
          <Text style={styles.callText}>Helpline</Text>
        </TouchableOpacity>

        {/* In-App Apply Button */}
        <TouchableOpacity
          style={[styles.inAppApplyBtn, applied && styles.appliedBtn]}
          onPress={handleApply}
          disabled={applying || applied}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#0A3728" />
          ) : (
            <>
              <Ionicons name={applied ? "checkmark-circle" : "send"} size={13} color="#0A3728" />
              <Text style={styles.inAppApplyText}>{applied ? "Applied ✓" : "Apply in App"}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyButton} onPress={() => Linking.openURL(scheme.url)}>
          <Text style={styles.applyText}>Portal →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A5C42", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#2E7D5A",
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  typeBadge: { backgroundColor: "#0A3728", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { color: "#F5C518", fontSize: 11, fontWeight: "600" },
  name: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", marginBottom: 2 },
  englishName: { fontSize: 12, color: "#A8D5B5", marginBottom: 8 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  benefit: { fontSize: 13, color: "#81C784", fontWeight: "600", flex: 1 },
  ministry: { fontSize: 12, color: "#A8D5B5", marginBottom: 12 },
  footer: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  callButton: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D5B5", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  callText: { fontSize: 12, fontWeight: "600", color: "#0A3728" },
  inAppApplyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#4CAF50", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  appliedBtn: { backgroundColor: "#2E7D5A" },
  inAppApplyText: { fontSize: 12, fontWeight: "700", color: "#0A3728" },
  applyButton: {
    backgroundColor: "#F5C518", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  applyText: { fontSize: 12, fontWeight: "700", color: "#0A3728" },
});
