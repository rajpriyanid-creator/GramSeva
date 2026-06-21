import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AudioService } from "@/services/audio.service";

interface Props {
  base64Audio: string | null;
  label?: string;
}

export default function AudioPlayer({ base64Audio, label = "Play" }: Props) {
  const [playing, setPlaying] = useState(false);

  const handlePlay = async () => {
    if (!base64Audio || playing) return;
    setPlaying(true);
    try {
      await AudioService.playBase64Audio(base64Audio);
    } catch {
      // ignore
    } finally {
      setPlaying(false);
    }
  };

  if (!base64Audio) return null;

  return (
    <TouchableOpacity style={styles.button} onPress={handlePlay} disabled={playing}>
      {playing ? (
        <ActivityIndicator size="small" color="#0A3728" />
      ) : (
        <Ionicons name="volume-high" size={18} color="#0A3728" />
      )}
      <Text style={styles.label}>{playing ? "Playing..." : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A8D5B5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#0A3728" },
});
