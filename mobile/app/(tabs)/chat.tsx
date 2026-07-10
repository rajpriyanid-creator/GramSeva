import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";
import { AudioService } from "@/services/audio.service";
import { TRANSLATIONS } from "@/constants/translations";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isSpeaking?: boolean;
}

export default function ChatScreen() {
  const { language, user } = useSessionStore();
  const activeLang = language?.code || "en-IN";
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS["en-IN"];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Voice States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Tracks the language Sarvam detected in the user's last voice input.
  // Used so TTS speaks back in the same language the user spoke, not the UI lang.
  const [detectedSpeakLang, setDetectedSpeakLang] = useState<string | null>(null);

  const startChatRecording = async () => {
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
      recordingRef.current = rec;
      setIsRecording(true);
    } catch (err) {
      console.warn(err);
      Alert.alert("Microphone Error", "Could not start recording.");
    }
  };

  const stopChatRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error("No audio URI");

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send "unknown" so Sarvam auto-detects the spoken language.
      // This means if user speaks English, it transcribes in English;
      // if Hindi, in Hindi — regardless of UI language setting.
      const res = await ApiService.rawTranscribe(base64Audio, "unknown");
      if (res.transcript) {
        setInputText(res.transcript);
        // Store the detected language for TTS reply if available
        if (res.detected_language_code) {
          setDetectedSpeakLang(res.detected_language_code);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not process voice. Please try again.");
    } finally {
      setIsTranscribing(false);
      recordingRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = messages
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.id === "welcome" ? t.chatWelcome : m.content }));

      const data = await ApiService.chat(history, activeLang, user?.id);

      const botMessage: Message = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const botMessage: Message = {
        id: `msg_${Date.now()}_err`,
        role: "assistant",
        content: activeLang === "hi-IN"
          ? "क्षमा करें, मैं अभी सहायक से नहीं जुड़ पा रहा हूँ।"
          : activeLang === "ta-IN"
          ? "மன்னிக்கவும், தற்சமயம் இணைக்க முடியவில்லை."
          : "Sorry, I am unable to connect to the assistant right now.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSpeak = async (item: Message) => {
    // If this specific message is already speaking — STOP it
    if (speakingMsgId === item.id) {
      await AudioService.stopPlayback();
      setSpeakingMsgId(null);
      return;
    }

    // If a different message is playing, stop it first
    if (speakingMsgId) {
      await AudioService.stopPlayback();
      setSpeakingMsgId(null);
    }

    setSpeakingMsgId(item.id);
    try {
      const contentToSpeak = item.id === "welcome" ? t.chatWelcome : item.content;
      // Use detected spoken language for TTS if available, otherwise fall back to UI language
      const ttsLang = detectedSpeakLang || activeLang;
      const data = await ApiService.getChatTTS(contentToSpeak, ttsLang);
      if (data.audio) {
        await AudioService.playBase64Audio(data.audio);
      }
    } catch (err) {
      console.warn("TTS playback failed", err);
    } finally {
      setSpeakingMsgId(null);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.id === "welcome" ? t.chatWelcome : item.content}
          </Text>
          {!isUser && (
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => handleSpeak(item)}
            >
              <Ionicons
                name={speakingMsgId === item.id ? "volume-mute" : "volume-high"}
                size={16}
                color={speakingMsgId === item.id ? "#F5C518" : "#A8D5B5"}
              />
              <Text style={styles.speakBtnText}>
                {speakingMsgId === item.id ? t.playingBtn : t.listenBtn}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Listening / Pulsating Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.pulsingDot} />
            <Text style={styles.recordingText}>
              {t.listeningText}
            </Text>
          </View>
        )}

        {/* Transcribing Indicator */}
        {isTranscribing && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#F5C518" />
            <Text style={styles.typingText}>{t.transcribingText}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#F5C518" />
            <Text style={styles.typingText}>{t.thinkingText}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t.chatPlaceholder}
            placeholderTextColor="#5a8a6a"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          {/* Mic voice input button */}
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            onPress={isRecording ? stopChatRecording : startChatRecording}
            disabled={isTranscribing || loading}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#F5C518" />
            ) : (
              <Ionicons
                name={isRecording ? "mic-off" : "mic"}
                size={20}
                color={isRecording ? "#FFFFFF" : "#0A3728"}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim() || loading || isRecording || isTranscribing}
            onPress={handleSend}
          >
            <Ionicons name="send" size={20} color="#0A3728" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  listContent: { padding: 16, gap: 16, paddingBottom: 24 },
  messageRow: { flexDirection: "row", gap: 10, maxWidth: "80%", alignItems: "flex-end" },
  userRow: { alignSelf: "flex-end", justifyContent: "flex-end" },
  botRow: { alignSelf: "flex-start", justifyContent: "flex-start" },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A5C42",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16 },
  bubble: { borderRadius: 18, padding: 12, elevation: 1 },
  userBubble: { backgroundColor: "#F5C518", borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: "#1A5C42", borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#0A3728", fontWeight: "500" },
  botText: { color: "#FFFFFF" },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#0A3728",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speakBtnText: { color: "#A8D5B5", fontSize: 11 },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#0A3728",
  },
  typingText: { color: "#A8D5B5", fontSize: 13, fontStyle: "italic" },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2E1C1C",
  },
  recordingText: {
    color: "#FF8A80",
    fontSize: 13,
    fontWeight: "500",
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A5C42",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2E7D5A",
    gap: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 4,
  },
  micBtn: {
    backgroundColor: "#F5C518",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  micBtnActive: {
    backgroundColor: "#FF3B30",
  },
  sendBtn: {
    backgroundColor: "#F5C518",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#2E7D5A",
    opacity: 0.5,
  },
});
