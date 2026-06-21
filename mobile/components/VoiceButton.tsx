import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  isRecording: boolean;
  onPress: () => void;
}

export default function VoiceButton({ isRecording, onPress }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <View style={styles.wrapper}>
      {isRecording && (
        <Animated.View
          style={[
            styles.pulse,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.button, isRecording && styles.buttonRecording]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={40}
            color={isRecording ? "#FFFFFF" : "#0A3728"}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
  },
  pulse: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(229, 57, 53, 0.25)",
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F5C518",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5C518",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: "#E53935",
    shadowColor: "#E53935",
  },
});
