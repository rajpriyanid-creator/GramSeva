import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { LANGUAGES } from "@/constants/languages";

interface Props {
  selected: string | null;
  onSelect: (lang: (typeof LANGUAGES)[number]) => void;
  visible: boolean;
  onClose: () => void;
}

export default function LanguagePicker({ selected, onSelect, visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose Language</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            numColumns={2}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.langCard,
                  selected === item.code && styles.langCardSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={styles.nativeName}>{item.nativeName}</Text>
                <Text style={styles.englishName}>{item.englishName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0F4C35",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#2E7D5A",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F5C518",
    textAlign: "center",
    marginBottom: 16,
  },
  grid: { gap: 10, paddingBottom: 20 },
  langCard: {
    flex: 1,
    margin: 5,
    backgroundColor: "#1A5C42",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  langCardSelected: { borderColor: "#F5C518" },
  flag: { fontSize: 28, marginBottom: 6 },
  nativeName: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  englishName: { fontSize: 12, color: "#A8D5B5", marginTop: 2 },
});
