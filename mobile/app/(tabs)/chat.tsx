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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isSpeaking?: boolean;
}

export default function ChatScreen() {
  const { language, user } = useSessionStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        language?.code === "hi-IN"
          ? "नमस्ते! मैं ग्रामसेवा एआई सहायक हूँ। आप मुझसे किसी भी सरकारी योजना या पात्रता के बारे में पूछ सकते हैं।"
          : language?.code === "ta-IN"
          ? "வணக்கம்! நான் உங்கள் கிராமசேவை எஐ உதவியாளர். அரசு திட்டங்கள், தகுதி அல்லது விண்ணப்ப விவரங்கள் பற்றி என்னிடம் கேளுங்கள்."
          : "Hello! I am your GramSeva AI Assistant. Feel free to ask me anything about government schemes, eligibility, or application details.",
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

      const res = await ApiService.rawTranscribe(base64Audio, language?.code || "en-IN");
      if (res.transcript) {
        setInputText(res.transcript);
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
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await ApiService.chat(history, language?.code || "hi-IN", user?.id);

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
        content: "Sorry, I am unable to connect to the assistant right now. Please check your internet connection and try again.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSpeak = async (item: Message) => {
    if (speakingMsgId) {
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(item.id);
    try {
      const data = await ApiService.getChatTTS(item.content, language?.code || "hi-IN");
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
            {item.content}
          </Text>
          {!isUser && item.id !== "welcome" && (
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
                {speakingMsgId === item.id ? "Playing..." : "Listen"}
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
              {language?.code === "hi-IN"
                ? "सुन रहा हूँ... रोकने के लिए टैप करें"
                : language?.code === "ta-IN"
                ? "கேட்கிறது... நிறுத்த தட்டவும்"
                : "Listening... Tap to stop"}
            </Text>
          </View>
        )}

        {/* Transcribing Indicator */}
        {isTranscribing && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#F5C518" />
            <Text style={styles.typingText}>Transcribing your voice...</Text>
          </View>
        )}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#F5C518" />
            <Text style={styles.typingText}>GramSeva Assistant is thinking...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={
              language?.code === "hi-IN"
                ? "योजनाओं के बारे में कुछ भी पूछें..."
                : language?.code === "ta-IN"
                ? "திட்டங்களைப் பற்றி கேளுங்கள்..."
                : "Ask anything about schemes..."
            }
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
