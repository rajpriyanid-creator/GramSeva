import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "@/store/session.store";
import { useSchemesStore } from "@/store/schemes.store";
import { ApiService } from "@/services/api.service";
import { AudioService } from "@/services/audio.service";
import { QUESTIONS } from "@/constants/questions";
import QuestionFlow from "@/components/QuestionFlow";
import SchemeCard from "@/components/SchemeCard";

type Step = "intro" | "questions" | "processing" | "results";

export default function HomeScreen() {
  const { language, profile, setProfile, sessionId } = useSessionStore();
  const { setMatchedSchemes } = useSchemesStore();
  const [step, setStep] = useState<Step>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);

  const questions =
    QUESTIONS[language?.code || "hi-IN"] || QUESTIONS["hi-IN"];

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
  };

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
              <SchemeCard key={scheme.id} scheme={scheme} language={language} />
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
        language={language}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
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
});
