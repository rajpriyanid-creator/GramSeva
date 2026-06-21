import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Question } from "@/constants/questions";
import VoiceButton from "@/components/VoiceButton";

interface Props {
  questions: Question[];
  currentIndex: number;
  total: number;
  isRecording: boolean;
  loading: boolean;
  onPressRecord: () => void;
  onSubmitText: (text: string) => void;
  language: any;
  onCancel?: () => void;
}

export default function QuestionFlow({
  questions,
  currentIndex,
  total,
  isRecording,
  loading,
  onPressRecord,
  onSubmitText,
  language,
  onCancel,
}: Props) {
  const [typedText, setTypedText] = useState("");
  const question = questions[currentIndex];
  const progress = (currentIndex / total) * 100;

  const activeLang = language?.code || "en-IN";
  const cancelText = activeLang === "ta-IN" ? "வெளியேறு" : activeLang === "hi-IN" ? "रद्द करें" : "Cancel";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with back button */}
        <View style={styles.header}>
          {onCancel && (
            <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
              <Ionicons name="arrow-back" size={20} color="#F5C518" />
              <Text style={styles.backText}>{cancelText}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {activeLang === "ta-IN" ? "தகுதி கண்டறிதல்" : activeLang === "hi-IN" ? "पात्रता विज़ार्ड" : "Eligibility Wizard"}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>
            {activeLang === "ta-IN"
              ? `கேள்வி ${currentIndex + 1} / ${total}`
              : activeLang === "hi-IN"
              ? `प्रश्न ${currentIndex + 1} / ${total}`
              : `Question ${currentIndex + 1} of ${total}`}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Question dots */}
        <View style={styles.dots}>
          {questions.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentIndex && styles.dotDone,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Question card */}
        <View style={styles.questionCard}>
          <Ionicons name="help-circle" size={28} color="#F5C518" />
          <Text style={styles.questionText}>{question.text}</Text>
          <Text style={styles.hintText}>{question.hint}</Text>
        </View>

        {/* Inputs */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F5C518" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <View style={styles.inputsWrapper}>
            {/* Voice button */}
            <View style={styles.micContainer}>
              <VoiceButton isRecording={isRecording} onPress={onPressRecord} />
              <Text style={styles.micLabel}>
                {isRecording
                  ? language?.ui?.stopRecording || "Tap to stop"
                  : language?.ui?.startRecording || "Tap to speak"}
              </Text>
            </View>

            {/* Text Input Option */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.typeContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={activeLang === "ta-IN" ? "பதிலை இங்கே தட்டச்சு செய்க..." : activeLang === "hi-IN" ? "अपना उत्तर यहाँ टाइप करें..." : "Type your answer here..."}
                placeholderTextColor="#5a8a6a"
                value={typedText}
                onChangeText={setTypedText}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !typedText.trim() && styles.sendBtnDisabled]}
                disabled={!typedText.trim()}
                onPress={() => {
                  onSubmitText(typedText);
                  setTypedText("");
                }}
              >
                <Ionicons name="send" size={16} color="#0A3728" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    color: "#F5C518",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#A8D5B5",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  progressContainer: { marginBottom: 16 },
  progressLabel: { color: "#A8D5B5", fontSize: 13, marginBottom: 6 },
  progressBar: {
    height: 4,
    backgroundColor: "#1A5C42",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F5C518",
    borderRadius: 2,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1A5C42",
  },
  dotDone: { backgroundColor: "#4CAF50" },
  dotActive: { backgroundColor: "#F5C518", width: 20 },
  questionCard: {
    backgroundColor: "#1A5C42",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
  },
  hintText: {
    fontSize: 13,
    color: "#A8D5B5",
    textAlign: "center",
    fontStyle: "italic",
  },
  inputsWrapper: {
    gap: 20,
    alignItems: "stretch",
  },
  micContainer: {
    alignItems: "center",
    gap: 10,
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: { color: "#A8D5B5", fontSize: 15 },
  micLabel: {
    color: "#A8D5B5",
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1A5C42",
  },
  dividerText: {
    color: "#A8D5B5",
    fontSize: 12,
    fontWeight: "600",
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5C42",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 6,
  },
  sendBtn: {
    backgroundColor: "#F5C518",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#2E7D5A",
    opacity: 0.5,
  },
});
