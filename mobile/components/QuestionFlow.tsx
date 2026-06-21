import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  language: any;
}

export default function QuestionFlow({
  questions,
  currentIndex,
  total,
  isRecording,
  loading,
  onPressRecord,
  language,
}: Props) {
  const question = questions[currentIndex];
  const progress = ((currentIndex) / total) * 100;

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>
          Question {currentIndex + 1} of {total}
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

      {/* Voice button */}
      <View style={styles.micContainer}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F5C518" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <>
            <VoiceButton isRecording={isRecording} onPress={onPressRecord} />
            <Text style={styles.micLabel}>
              {isRecording
                ? (language?.ui?.stopRecording || "Tap to stop")
                : (language?.ui?.startRecording || "Tap to answer")}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
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
    marginBottom: 32,
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
    padding: 28,
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#2E7D5A",
  },
  questionText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
  },
  hintText: {
    fontSize: 14,
    color: "#A8D5B5",
    textAlign: "center",
    fontStyle: "italic",
  },
  micContainer: {
    alignItems: "center",
    gap: 16,
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: { color: "#A8D5B5", fontSize: 15 },
  micLabel: {
    color: "#A8D5B5",
    fontSize: 14,
  },
});
