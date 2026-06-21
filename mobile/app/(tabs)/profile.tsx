import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";

export default function ProfileScreen() {
  const { user, token, logout, language, setLanguage } = useSessionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(user);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const data = await ApiService.getMe(user.id);
      setUserInfo(data.user);
    } catch (err) {
      console.warn("Could not reload user info", err);
    }
  };

  useEffect(() => {
    if (token && user?.id) {
      fetchProfile();
    }
  }, [token, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
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
  };

  const activeLang = language?.code || "en-IN";

  // Language options config
  const LANGS = [
    { code: "en-IN", name: "English 🇬🇧", label: "English" },
    { code: "hi-IN", name: "हिन्दी 🇮🇳", label: "Hindi" },
    { code: "ta-IN", name: "தமிழ் 🇮🇳", label: "Tamil" },
  ];

  const handleLanguageChange = (langCode: string) => {
    const matched = LANGS.find(l => l.code === langCode);
    if (matched) {
      // Find full translation structure from state/store if needed, or simply update language state
      const newLangObj = {
        code: matched.code,
        nativeName: matched.name,
        englishName: matched.label,
        flag: matched.code === "en-IN" ? "🇬🇧" : "🇮🇳",
        states: matched.code === "en-IN" ? ["ALL"] : ["TN", "UP", "MP"],
        greetings: { namaste: matched.code === "ta-IN" ? "வணக்கம்! 🙏" : matched.code === "hi-IN" ? "नमस्ते! 🙏" : "Hello! 👋" },
        ui: {}
      };
      setLanguage(newLangObj as any);
      Alert.alert("Success", matched.code === "ta-IN" ? "மொழி மாற்றப்பட்டது!" : matched.code === "hi-IN" ? "भाषा बदल दी गई है!" : "Language updated successfully!");
    }
  };

  const t = {
    title: activeLang === "ta-IN" ? "சுயவிவரம்" : activeLang === "hi-IN" ? "मेरी प्रोफ़ाइल" : "My Profile",
    editBtn: activeLang === "ta-IN" ? "விவரங்களை திருத்து" : activeLang === "hi-IN" ? "जानकारी बदलें / एडिट करें" : "Edit Profile Details",
    logoutBtn: activeLang === "ta-IN" ? "வெளியேறு" : activeLang === "hi-IN" ? "लॉगआउट" : "Logout",
    appLang: activeLang === "ta-IN" ? "பயன்பாட்டு மொழி" : activeLang === "hi-IN" ? "ऐप की भाषा" : "App Language",
    personal: activeLang === "ta-IN" ? "தனிப்பட்ட விவரங்கள்" : activeLang === "hi-IN" ? "व्यक्तिगत जानकारी" : "Personal Details",
    location: activeLang === "ta-IN" ? "இருப்பிடம்" : activeLang === "hi-IN" ? "स्थान विवरण" : "Location Details",
    economic: activeLang === "ta-IN" ? "பொருளாதார நிலை" : activeLang === "hi-IN" ? "आर्थिक विवरण" : "Economic Details",
    documents: activeLang === "ta-IN" ? "ஆவணங்கள்" : activeLang === "hi-IN" ? "सरकारी दस्तावेज" : "Government Documents",
    bank: activeLang === "ta-IN" ? "வங்கி விவரங்கள்" : activeLang === "hi-IN" ? "बैंक खाता विवरण" : "Bank Details",
  };

  const renderInfoRow = (label: string, value: any) => {
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    );
  };

  if (!userInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F5C518" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F5C518" />}
      >
        {/* User Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.profileName}>{userInfo.name}</Text>
          <Text style={styles.profileId}>GramSeva ID: {userInfo.gramsevaId}</Text>
          <Text style={styles.profilePhone}>📞 +91 {userInfo.phone}</Text>

          <TouchableOpacity style={styles.editButton} onPress={() => router.push("/profile-setup")}>
            <Ionicons name="create-outline" size={16} color="#0A3728" />
            <Text style={styles.editButtonText}>{t.editBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Personal Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.personal}</Text>
          </View>
          <View style={styles.divider} />
          {renderInfoRow("Age", userInfo.age)}
          {renderInfoRow("Gender", userInfo.gender)}
          {renderInfoRow("Marital Status", userInfo.maritalStatus)}
          {renderInfoRow("Family Size", userInfo.familySize)}
          {renderInfoRow("Education Level", userInfo.educationLevel)}
        </View>

        {/* 2. Location Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="location" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.location}</Text>
          </View>
          <View style={styles.divider} />
          {renderInfoRow("State", userInfo.state)}
          {renderInfoRow("District", userInfo.district)}
          {renderInfoRow("House Type", userInfo.houseType)}
        </View>

        {/* 3. Economic Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="cash" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.economic}</Text>
          </View>
          <View style={styles.divider} />
          {renderInfoRow("Caste Category", userInfo.caste_category)}
          {renderInfoRow("Community", userInfo.community)}
          {renderInfoRow("Annual Income", userInfo.annual_income ? `₹${userInfo.annual_income}` : null)}
          {renderInfoRow("BPL Card Holder", userInfo.bpl_card ? "Yes" : "No")}
          {renderInfoRow("Occupation", userInfo.occupation)}
          {renderInfoRow("Land Holding (Acres)", userInfo.land_acres)}
          {renderInfoRow("Land Type", userInfo.landType)}
        </View>

        {/* 4. Document Numbers */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="document-text" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.documents}</Text>
          </View>
          <View style={styles.divider} />
          {renderInfoRow("Aadhaar Card", userInfo.aadhaarNo ? `XXXX XXXX ${userInfo.aadhaarNo.slice(-4)}` : null)}
          {renderInfoRow("Ration Card", userInfo.rationCardNo)}
          {renderInfoRow("Income Certificate", userInfo.incomeCertNo)}
          {renderInfoRow("Community Certificate", userInfo.communityCertNo)}
          {renderInfoRow("Voter ID Card", userInfo.voterId)}
        </View>

        {/* 5. Bank Account Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="card" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.bank}</Text>
          </View>
          <View style={styles.divider} />
          {renderInfoRow("Bank Name", userInfo.bankName)}
          {renderInfoRow("Account Number", userInfo.bankAccountNo ? `XXXXXX${userInfo.bankAccountNo.slice(-4)}` : null)}
          {renderInfoRow("IFSC Code", userInfo.ifscCode)}
        </View>

        {/* Language Selection Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="language" size={18} color="#F5C518" />
            <Text style={styles.sectionTitle}>{t.appLang}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.langRow}>
            {LANGS.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, activeLang === l.code && styles.langChipActive]}
                onPress={() => handleLanguageChange(l.code)}
              >
                <Text style={[styles.langChipText, activeLang === l.code && styles.langChipTextActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>{t.logoutBtn}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  profileHeaderCard: {
    backgroundColor: "#1A5C42",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0A3728",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#F5C518",
  },
  avatarEmoji: { fontSize: 32 },
  profileName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  profileId: { fontSize: 13, color: "#F5C518", fontFamily: "monospace", marginTop: 4 },
  profilePhone: { fontSize: 13, color: "#A8D5B5", marginTop: 4 },
  editButton: {
    backgroundColor: "#F5C518",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  editButtonText: { fontSize: 13, fontWeight: "700", color: "#0A3728" },
  sectionCard: {
    backgroundColor: "#1A5C42",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  divider: { height: 1, backgroundColor: "#2E7D5A", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E6B4D",
  },
  infoLabel: { fontSize: 13, color: "#A8D5B5", fontWeight: "500" },
  infoValue: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
  langRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 },
  langChip: {
    backgroundColor: "#0A3728",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  langChipActive: {
    borderColor: "#F5C518",
    backgroundColor: "#1A5C42",
  },
  langChipText: { fontSize: 13, color: "#A8D5B5" },
  langChipTextActive: { color: "#F5C518", fontWeight: "700" },
  logoutButton: {
    backgroundColor: "#D32F2F",
    borderRadius: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  logoutButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
