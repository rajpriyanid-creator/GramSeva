import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";
import { TRANSLATIONS } from "@/constants/translations";

type Mode = "login" | "register";

export default function AuthScreen() {
  const { setAuth, language } = useSessionStore();
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeLang = language?.code || "en-IN";
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS["en-IN"];

  const handleSubmit = async () => {
    if (!phone || !password) return Alert.alert("Error", t.requiredAlert || "Please fill all fields");
    if (!/^\d{10}$/.test(phone)) return Alert.alert("Error", t.enterMobile || "Enter a valid 10-digit phone number");
    if (mode === "register" && !name.trim()) return Alert.alert("Error", t.enterFullName || "Please enter your name");
    if (password.length < 6) return Alert.alert("Error", t.enterPassword || "Password must be at least 6 characters");

    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await ApiService.login(phone, password);
      } else {
        data = await ApiService.register(phone, password, name.trim());
        const loginData = await ApiService.login(phone, password);
        data = loginData;
      }
      setAuth(data.user, data.token);
      if (!data.user.profileComplete) {
        router.replace("/profile-setup");
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Something went wrong. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "padding"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <Text style={s.logo}>🌿 {t.loginTitle}</Text>
            <Text style={s.tagline}>{t.loginSubtitle}</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Mode Toggle */}
            <View style={s.toggle}>
              <TouchableOpacity
                style={[s.toggleBtn, mode === "login" && s.toggleActive]}
                onPress={() => setMode("login")}
              >
                <Text style={[s.toggleText, mode === "login" && s.toggleTextActive]}>{t.loginToggle}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, mode === "register" && s.toggleActive]}
                onPress={() => setMode("register")}
              >
                <Text style={[s.toggleText, mode === "register" && s.toggleTextActive]}>{t.registerToggle}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.heading}>
              {mode === "login" ? t.welcomeBack : t.createAccount}
            </Text>
            <Text style={s.subheading}>
              {mode === "login" ? t.loginDesc : t.registerDesc}
            </Text>

            {mode === "register" && (
              <View style={s.inputGroup}>
                <Text style={s.label}>{t.fullName}</Text>
                <View style={s.inputRow}>
                  <Ionicons name="person-outline" size={18} color="#A8D5B5" style={s.inputIcon} />
                  <TextInput
                    style={s.input} placeholder={t.enterFullName}
                    placeholderTextColor="#5a8a6a" value={name}
                    onChangeText={setName} autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={s.inputGroup}>
              <Text style={s.label}>{t.mobileNumber}</Text>
              <View style={s.inputRow}>
                <Ionicons name="call-outline" size={18} color="#A8D5B5" style={s.inputIcon} />
                <Text style={s.prefix}>+91 </Text>
                <TextInput
                  style={[s.input, { flex: 1 }]} placeholder={t.enterMobile}
                  placeholderTextColor="#5a8a6a" value={phone}
                  onChangeText={setPhone} keyboardType="numeric" maxLength={10}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>{t.password}</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#A8D5B5" style={s.inputIcon} />
                <TextInput
                  style={[s.input, { flex: 1 }]} placeholder={t.enterPassword}
                  placeholderTextColor="#5a8a6a" value={password}
                  onChangeText={setPassword} secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#A8D5B5" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0A3728" />
              ) : (
                <>
                  <Ionicons name={mode === "login" ? "log-in-outline" : "person-add-outline"} size={20} color="#0A3728" />
                  <Text style={s.submitText}>{mode === "login" ? t.loginBtn : t.registerBtn}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")} style={s.switchLink}>
              <Text style={s.switchText}>
                {mode === "login" ? t.noAccount : t.haveAccount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo credentials hint */}
          <View style={s.demoBox}>
            <Text style={s.demoTitle}>{t.demoAccounts}</Text>
            <Text style={s.demoText}>9876543210 / ravi@123</Text>
            <Text style={s.demoText}>9876543211 / priya@123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: "800", color: "#F5C518", letterSpacing: 1 },
  tagline: { fontSize: 12, color: "#A8D5B5", marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: "#112e20", borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: "#1e4d35",
  },
  toggle: {
    flexDirection: "row", backgroundColor: "#0A3728",
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  toggleActive: { backgroundColor: "#F5C518" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#A8D5B5" },
  toggleTextActive: { color: "#0A3728" },
  heading: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  subheading: { fontSize: 13, color: "#A8D5B5", marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: "#A8D5B5", fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0A3728", borderRadius: 12,
    borderWidth: 1, borderColor: "#1e4d35", paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  prefix: { color: "#A8D5B5", fontSize: 14, fontWeight: "600" },
  input: { flex: 1, color: "#FFFFFF", fontSize: 15 },
  submitBtn: {
    backgroundColor: "#F5C518", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: "700", color: "#0A3728" },
  switchLink: { alignItems: "center", marginTop: 16 },
  switchText: { fontSize: 13, color: "#A8D5B5" },
  demoBox: {
    marginTop: 24, backgroundColor: "#112e20", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#1e4d35",
  },
  demoTitle: { color: "#F5C518", fontWeight: "700", fontSize: 13, marginBottom: 8 },
  demoText: { color: "#A8D5B5", fontSize: 12, fontFamily: "monospace", marginBottom: 2 },
});
