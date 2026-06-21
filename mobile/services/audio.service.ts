import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";

export const AudioService = {
  /**
   * Play a base64-encoded WAV audio string returned by Sarvam TTS.
   */
  async playBase64Audio(base64Audio: string): Promise<void> {
    const uri = `${FileSystem.cacheDirectory}tts_${Date.now()}.wav`;
    try {
      // Write base64 to temp file
      await FileSystem.writeAsStringAsync(uri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );

      // Wait until done
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      });
    } finally {
      // Clean up temp file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // ignore cleanup errors
      }
    }
  },

  /**
   * Set audio mode for recording.
   */
  async setRecordingMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldRouteThroughEarpieceAndroid: false,
    });
  },

  /**
   * Set audio mode for playback.
   */
  async setPlaybackMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldRouteThroughEarpieceAndroid: false,
    });
  },
};
