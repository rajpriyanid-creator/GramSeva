import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";
import { getTranslatedSchemeName } from "@/constants/schemeTranslations";

export default function SchemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useSessionStore();
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (id) fetchScheme();
  }, [id]);

  const fetchScheme = async () => {
    try {
      const data = await ApiService.getScheme(id!);
      setScheme(data.scheme);
    } catch (err) {
      Alert.alert("Error", "Could not load scheme details.");
    } finally {
      setLoading(false);
    }
  };

  const downloadChecklist = async () => {
    setDownloadingPDF(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL || "https://gramseva-api-c102.onrender.com"}/api/pdf/checklist/${id}`;
      const fileUri = `${FileSystem.documentDirectory}GramSeva-${id}-checklist.pdf`;
      await FileSystem.downloadAsync(url, fileUri);
      Alert.alert(
        "Checklist Downloaded",
        "PDF checklist saved. Visit your nearest CSC with this document list.",
        [{ text: "OK" }]
      );
    } catch (err) {
      Alert.alert("Download failed", "Could not download PDF checklist.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const localName = getTranslatedSchemeName(scheme, language?.code || "en-IN");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C518" />
        </View>
      </SafeAreaView>
    );
  }

  if (!scheme) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Scheme not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: (localName || scheme.name).slice(0, 30) }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{scheme.type}</Text>
        </View>

        {/* Names (Fixed displaying properly for English and local languages) */}
        <Text style={styles.titleText}>{localName || scheme.name}</Text>
        {localName && localName !== scheme.name && (
          <Text style={styles.englishSubName}>{scheme.name}</Text>
        )}

        <Text style={styles.ministry}>{scheme.ministry}</Text>

        {/* Benefit Card */}
        <View style={styles.benefitCard}>
          <Ionicons name="cash" size={24} color="#81C784" />
          <View style={{ flex: 1 }}>
            <Text style={styles.benefitLabel}>What you get (Benefit)</Text>
            <Text style={styles.benefitValue}>{scheme.benefit}</Text>
          </View>
        </View>

        {/* Eligibility Criteria (Dynamic from DB criteria) */}
        {scheme.criteria && scheme.criteria.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eligibility Criteria Requirements</Text>
            {scheme.criteria.map((crit: any, i: number) => (
              <View key={crit.id || i} style={styles.docRow}>
                <Ionicons name="shield-checkmark" size={16} color="#F5C518" />
                <Text style={styles.docText}>
                  {crit.label || `${crit.field.toUpperCase().replace("_", " ")} ${crit.operator} ${crit.value}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Department Info */}
        {scheme.department && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offering Department</Text>
            <Text style={styles.sectionValue}>{scheme.department.name}</Text>
            {scheme.department.helpline ? (
              <TouchableOpacity
                style={styles.helplineRow}
                onPress={() =>
                  Linking.openURL(`tel:${scheme.department.helpline}`)
                }
              >
                <Ionicons name="call" size={16} color="#F5C518" />
                <Text style={styles.helplineText}>
                  Helpline: {scheme.department.helpline}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Documents needed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents Typically Required</Text>
          {[
            "Aadhaar Card",
            "Ration Card (BPL/APL)",
            "Bank Passbook",
            "Income Certificate",
            "Caste Certificate (if SC/ST/OBC)",
            "Land Records (for farmers)",
            "Passport Photos (2 copies)",
          ].map((doc, i) => (
            <View key={i} style={styles.docRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#A8D5B5" />
              <Text style={styles.docText}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={downloadChecklist}
          disabled={downloadingPDF}
        >
          {downloadingPDF ? (
            <ActivityIndicator size="small" color="#0A3728" />
          ) : (
            <Ionicons name="document-text" size={20} color="#0A3728" />
          )}
          <Text style={styles.pdfButtonText}>
            {downloadingPDF ? "Downloading..." : "Download PDF Checklist"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => Linking.openURL(scheme.url)}
        >
          <Ionicons name="open-outline" size={20} color="#0A3728" />
          <Text style={styles.applyButtonText}>Apply on Official Portal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  scroll: { padding: 20, paddingBottom: 60 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#A8D5B5", fontSize: 16 },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1A5C42",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  typeText: { color: "#F5C518", fontSize: 12, fontWeight: "600" },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 32,
    marginBottom: 4,
  },
  englishSubName: {
    fontSize: 14,
    color: "#A8D5B5",
    marginBottom: 6,
    fontStyle: "italic",
  },
  ministry: { fontSize: 13, color: "#6B9E7A", marginBottom: 20, fontWeight: "500" },
  benefitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A5C42",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  benefitLabel: { fontSize: 11, color: "#A8D5B5", textTransform: "uppercase", fontWeight: "700" },
  benefitValue: { fontSize: 16, fontWeight: "700", color: "#81C784", marginTop: 4, lineHeight: 22 },
  section: {
    marginBottom: 20,
    backgroundColor: "#1A5C42",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  sectionTitle: {
    fontSize: 12,
    color: "#A8D5B5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    fontWeight: "700",
  },
  sectionValue: { fontSize: 15, color: "#FFFFFF", marginBottom: 8, fontWeight: "600" },
  helplineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  helplineText: { fontSize: 15, color: "#F5C518", fontWeight: "600" },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  docText: { fontSize: 14, color: "#E8F5E9", flex: 1, lineHeight: 20 },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#A8D5B5",
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  pdfButtonText: { fontSize: 16, fontWeight: "700", color: "#0A3728" },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F5C518",
    borderRadius: 14,
    paddingVertical: 15,
  },
  applyButtonText: { fontSize: 16, fontWeight: "700", color: "#0A3728" },
});
