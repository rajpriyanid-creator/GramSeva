import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSessionStore } from "@/store/session.store";
import { useSchemesStore } from "@/store/schemes.store";
import { ApiService } from "@/services/api.service";
import { AudioService } from "@/services/audio.service";
import { QUESTIONS } from "@/constants/questions";
import QuestionFlow from "@/components/QuestionFlow";

type Step = "intro" | "questions" | "processing" | "results";

export default function HomeScreen() {
  const { language, profile, setProfile, sessionId, user, token } = useSessionStore();
  const { setMatchedSchemes } = useSchemesStore();
  const [step, setStep] = useState<Step>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);

  // Dashboard Stats
  const [eligibleCount, setEligibleCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const questions =
    QUESTIONS[language?.code || "hi-IN"] || QUESTIONS["hi-IN"];

  const loadDashboardData = async () => {
    if (!user?.id) return;
    try {
      const [eligRes, appRes] = await Promise.all([
        ApiService.getEligibleSchemes(user.id),
        ApiService.getUserApplications(user.id),
      ]);
      setEligibleCount(eligRes?.schemes?.length || 0);
      setAppliedCount(appRes?.applications?.length || 0);
    } catch (err) {
      console.warn("Could not load dashboard details", err);
    }
  };

  useEffect(() => {
    if (token && user?.id) {
      loadDashboardData();
    }
  }, [token, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant microphone access.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording.current = rec;
      setIsRecording(true);
    } catch (err) {
      Alert.alert("Microphone Error", "Could not access microphone.");
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;
    setIsRecording(false);
    setLoading(true);

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      if (!uri) throw new Error("No audio URI");

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await ApiService.transcribeAndProcess({
        audio: base64Audio,
        language_code: language?.code || "hi-IN",
        question_key: questions[currentQuestion].key,
        session_id: sessionId,
      });

      const newAnswers = {
        ...answers,
        [questions[currentQuestion].key]: result.transcript,
      };
      setAnswers(newAnswers);

      if (result.confirmation_audio) {
        await AudioService.playBase64Audio(result.confirmation_audio);
      }

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        if (result.next_question_audio) {
          await AudioService.playBase64Audio(result.next_question_audio);
        }
      } else {
        await findSchemes(newAnswers);
      }
    } catch (err) {
      Alert.alert("Error", "Could not process voice. Please try again.");
    } finally {
      setLoading(false);
      recording.current = null;
    }
  };

  const handleTextSubmit = async (text: string) => {
    setLoading(true);
    try {
      const newAnswers = {
        ...answers,
        [questions[currentQuestion].key]: text,
      };
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        await findSchemes(newAnswers);
      }
    } catch (err) {
      Alert.alert("Error", "Could not process answer.");
    } finally {
      setLoading(false);
    }
  };

  const findSchemes = async (finalAnswers: Record<string, string>) => {
    setStep("processing");
    try {
      const result = await ApiService.findSchemes({
        answers: finalAnswers,
        language_code: language?.code || "hi-IN",
        state: profile?.state || "TN",
        session_id: sessionId,
      });
      setSchemes(result.schemes);
      setMatchedSchemes(result.schemes);
      setProfile(result.user_profile);

      if (result.summary_audio) {
        await AudioService.playBase64Audio(result.summary_audio);
      }
      setStep("results");
    } catch (err) {
      Alert.alert("Error", "Could not find schemes. Check internet connection.");
      setStep("intro");
    }
  };

  const restart = () => {
    setStep("intro");
    setCurrentQuestion(0);
    setAnswers({});
    setSchemes([]);
    loadDashboardData();
  };

  const activeLang = language?.code || "en-IN";

  // Localized Strings
  const t = {
    welcome: activeLang === "ta-IN" ? "வரவேற்கிறோம்" : activeLang === "hi-IN" ? "स्वागत है" : "Welcome back",
    eligibleTitle: activeLang === "ta-IN" ? "தகுதியான திட்டங்கள்" : activeLang === "hi-IN" ? "पात्र योजनाएं" : "Eligible Schemes",
    appliedTitle: activeLang === "ta-IN" ? "விண்ணப்பித்தவை" : activeLang === "hi-IN" ? "आवेदन इतिहास" : "Applied Schemes",
    viewAll: activeLang === "ta-IN" ? "அனைத்தையும் பார்" : activeLang === "hi-IN" ? "सभी देखें" : "View Details",
    servicesHeader: activeLang === "ta-IN" ? "விரைவு சேவைகள்" : activeLang === "hi-IN" ? "त्वरित सेवाएं" : "Quick Services",
    
    // Services
    voiceTitle: activeLang === "ta-IN" ? "வாய்ஸ் தகுதி சரிபார்ப்பு" : activeLang === "hi-IN" ? "वॉइस पात्रता जाँच" : "Voice Questionnaire",
    voiceSub: activeLang === "ta-IN" ? "பேசி தகுதியை கண்டறியவும்" : activeLang === "hi-IN" ? "बोलकर अपनी पात्रता जांचें" : "Answer questions by speaking",
    
    chatTitle: activeLang === "ta-IN" ? "எஐ உரையாடல்" : activeLang === "hi-IN" ? "एआई चैट सहायक" : "AI Assistant Chat",
    chatSub: activeLang === "ta-IN" ? "திட்டங்கள் பற்றி கேளுங்கள்" : activeLang === "hi-IN" ? "योजनाओं के बारे में पूछें" : "Ask doubts via voice/text",
    
    cscTitle: activeLang === "ta-IN" ? "அருகிலுள்ள இ-சேவை மையம்" : activeLang === "hi-IN" ? "नजदीकी सीएससी सेंटर" : "Locate CSC Centers",
    cscSub: activeLang === "ta-IN" ? "இருப்பிடத்தை கண்டறியவும்" : activeLang === "hi-IN" ? "अपने पास का सीएससी खोजें" : "Find nearby Common Service Centers",
    
    tipsTitle: activeLang === "ta-IN" ? "உங்களுக்கு தெரியுமா?" : activeLang === "hi-IN" ? "क्या आप जानते हैं?" : "Did you know?",
    tipsSub: activeLang === "ta-IN" 
      ? "உங்கள் ஆதார் மற்றும் வங்கி கணக்கு புத்தகம் எப்போதும் கைவசம் வைத்திருக்கவும்." 
      : activeLang === "hi-IN" 
      ? "योजनाओं में तेजी से आवेदन के लिए आधार और बैंक पासबुक तैयार रखें।" 
      : "Keep your Aadhaar Card and Bank Passbook ready for faster scheme processing.",
  };

  if (step === "intro" && token && user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.dashboardContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F5C518" />}
        >
          {/* Dashboard Header */}
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.welcomeText}>{t.welcome},</Text>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userId}>ID: {user.gramsevaId}</Text>
            </View>
            <View style={styles.stateBadge}>
              <Ionicons name="location" size={16} color="#0A3728" />
              <Text style={styles.stateBadgeText}>{user.state || "ALL"}</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/results")}>
              <View style={[styles.statIconBox, { backgroundColor: "#F5C51822" }]}>
                <Ionicons name="checkmark-circle" size={24} color="#F5C518" />
              </View>
              <Text style={styles.statNumber}>{eligibleCount}</Text>
              <Text style={styles.statLabel}>{t.eligibleTitle}</Text>
              <Text style={styles.statAction}>{t.viewAll} →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/results")}>
              <View style={[styles.statIconBox, { backgroundColor: "#81C78422" }]}>
                <Ionicons name="document-text" size={24} color="#81C784" />
              </View>
              <Text style={styles.statNumber}>{appliedCount}</Text>
              <Text style={styles.statLabel}>{t.appliedTitle}</Text>
              <Text style={styles.statAction}>{t.viewAll} →</Text>
            </TouchableOpacity>
          </View>

          {/* Services Section */}
          <Text style={styles.sectionHeader}>{t.servicesHeader}</Text>

          <View style={styles.servicesList}>
            {/* Service 1: Voice questionnaire */}
            <TouchableOpacity style={styles.serviceItem} onPress={() => setStep("questions")}>
              <View style={[styles.serviceIconBox, { backgroundColor: "#FF8A80" }]}>
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.serviceMeta}>
                <Text style={styles.serviceTitle}>{t.voiceTitle}</Text>
                <Text style={styles.serviceSub}>{t.voiceSub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A8D5B5" />
            </TouchableOpacity>

            {/* Service 2: AI Chat */}
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push("/(tabs)/chat")}>
              <View style={[styles.serviceIconBox, { backgroundColor: "#4FC3F7" }]}>
                <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.serviceMeta}>
                <Text style={styles.serviceTitle}>{t.chatTitle}</Text>
                <Text style={styles.serviceSub}>{t.chatSub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A8D5B5" />
            </TouchableOpacity>

            {/* Service 3: CSC locator */}
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push("/(tabs)/csc")}>
              <View style={[styles.serviceIconBox, { backgroundColor: "#81C784" }]}>
                <Ionicons name="location" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.serviceMeta}>
                <Text style={styles.serviceTitle}>{t.cscTitle}</Text>
                <Text style={styles.serviceSub}>{t.cscSub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A8D5B5" />
            </TouchableOpacity>
          </View>

          {/* Informational Banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerHeader}>
              <Ionicons name="bulb-outline" size={20} color="#F5C518" />
              <Text style={styles.infoBannerTitle}>{t.tipsTitle}</Text>
            </View>
            <Text style={styles.infoBannerText}>{t.tipsSub}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Non-logged-in intro screen
  if (step === "intro") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.introContainer}>
          <Text style={styles.greeting}>
            {language?.greetings?.namaste || "नमस्ते! 🙏"}
          </Text>
          <Text style={styles.introText}>
            {language?.ui?.intro ||
              "मैं आपको सरकारी योजनाओं के बारे में बताऊंगा। कुछ सवाल पूछूंगा।"}
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#F5C518" />
            <Text style={styles.infoText}>
              8 simple questions • 3 minutes • No login required
            </Text>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setStep("questions")}
          >
            <Ionicons name="mic" size={22} color="#0A3728" />
            <Text style={styles.startButtonText}>
              {language?.ui?.startButton || "शुरू करें / Start"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "processing") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#F5C518" />
          <Text style={styles.processingText}>
            {language?.ui?.searching || "योजनाएं खोज रहे हैं..."}
          </Text>
          <Text style={styles.processingSubtext}>
            Checking eligibility across 500+ schemes
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "results") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {schemes.length} {language?.ui?.schemesFound || "योजनाएं मिलीं"}
          </Text>
          <TouchableOpacity onPress={restart}>
            <Ionicons name="refresh" size={24} color="#F5C518" />
          </TouchableOpacity>
        </View>
        {schemes.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color="#A8D5B5" />
            <Text style={styles.noResultsText}>No matching schemes found.</Text>
            <Text style={styles.noResultsSubtext}>
              Try adjusting your answers or browse all schemes.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {schemes.map((scheme) => (
              <View key={scheme.id} style={{ marginBottom: 12 }}>
                <Text style={{ color: "#FFF" }}>{scheme.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <QuestionFlow
        questions={questions}
        currentIndex={currentQuestion}
        total={questions.length}
        isRecording={isRecording}
        loading={loading}
        onPressRecord={isRecording ? stopRecording : startRecording}
        onSubmitText={handleTextSubmit}
        language={language}
        onCancel={restart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  dashboardContainer: { paddingBottom: 40 },
  dashboardHeader: {
    padding: 20,
    backgroundColor: "#1A5C42",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  welcomeText: { color: "#A8D5B5", fontSize: 13, fontWeight: "500" },
  userName: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginVertical: 2 },
  userId: { color: "#F5C518", fontSize: 12, fontWeight: "600", fontFamily: "monospace" },
  stateBadge: {
    backgroundColor: "#F5C518",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stateBadgeText: { color: "#0A3728", fontWeight: "800", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A5C42",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  statLabel: { fontSize: 13, color: "#A8D5B5", marginTop: 4, fontWeight: "500" },
  statAction: { fontSize: 12, color: "#F5C518", marginTop: 10, fontWeight: "700" },
  sectionHeader: {
    color: "#F5C518",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  servicesList: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5C42",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2E7D5A",
    gap: 14,
  },
  serviceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceMeta: { flex: 1 },
  serviceTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  serviceSub: { fontSize: 12, color: "#A8D5B5", marginTop: 2 },
  infoBanner: {
    marginHorizontal: 16,
    backgroundColor: "#0F4C35",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  infoBannerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoBannerTitle: { color: "#F5C518", fontWeight: "700", fontSize: 14 },
  infoBannerText: { color: "#A8D5B5", fontSize: 13, lineHeight: 18 },
  introContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  greeting: {
    fontSize: 32,
    color: "#F5C518",
    fontWeight: "700",
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    color: "#c8e6c9",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A5C42",
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
  },
  infoText: { fontSize: 13, color: "#A8D5B5" },
  startButton: {
    backgroundColor: "#F5C518",
    borderRadius: 50,
    paddingHorizontal: 40,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startButtonText: { fontSize: 18, fontWeight: "700", color: "#0A3728" },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  processingText: { fontSize: 18, color: "#F5C518", fontWeight: "600" },
  processingSubtext: { fontSize: 13, color: "#A8D5B5" },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  resultsTitle: { fontSize: 22, fontWeight: "700", color: "#F5C518" },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  noResultsText: { fontSize: 18, color: "#FFFFFF", fontWeight: "600" },
  noResultsSubtext: {
    fontSize: 14,
    color: "#A8D5B5",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { color: "#A8D5B5", fontSize: 15 },
});
