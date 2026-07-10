import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";

// Module-level reference so we can stop playback from outside
let _currentSound: Audio.Sound | null = null;

export const AudioService = {
  /**
   * Stop any currently playing TTS audio immediately.
   */
  async stopPlayback(): Promise<void> {
    if (_currentSound) {
      try {
        await _currentSound.stopAsync();
        await _currentSound.unloadAsync();
      } catch {
        // ignore errors during stop
      } finally {
        _currentSound = null;
      }
    }
  },

  /**
   * Play a base64-encoded WAV audio string returned by Sarvam TTS.
   * If audio is already playing, stops it first.
   */
  async playBase64Audio(base64Audio: string): Promise<void> {
    // Stop any existing playback first
    await AudioService.stopPlayback();

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
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );

      _currentSound = sound;

      // Wait until done (or stopped externally)
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && (status.didJustFinish || !status.isPlaying)) {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
              _currentSound = null;
              resolve();
            }
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
      playThroughEarpieceAndroid: false,
    });
  },

  /**
   * Set audio mode for playback.
   */
  async setPlaybackMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
    });
  },
};
