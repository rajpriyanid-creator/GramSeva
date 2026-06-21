import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useSessionStore } from "@/store/session.store";
import { ApiService } from "@/services/api.service";
import { AudioService } from "@/services/audio.service";

const STATES = ["AP","AR","AS","BR","CG","GA","GJ","HR","HP","JH","KA","KL","MP","MH","MN","ML","MZ","NL","OD","PB","RJ","SK","TN","TS","TR","UP","UK","WB","DL","JK","LA","AN","CH","DN","DD","LD","PY"];
const STATES_FULL: Record<string, string> = {
  AP:"Andhra Pradesh",AR:"Arunachal Pradesh",AS:"Assam",BR:"Bihar",CG:"Chhattisgarh",
  GA:"Goa",GJ:"Gujarat",HR:"Haryana",HP:"Himachal Pradesh",JH:"Jharkhand",
  KA:"Karnataka",KL:"Kerala",MP:"Madhya Pradesh",MH:"Maharashtra",MN:"Manipur",
  ML:"Meghalaya",MZ:"Mizoram",NL:"Nagaland",OD:"Odisha",PB:"Punjab",
  RJ:"Rajasthan",SK:"Sikkim",TN:"Tamil Nadu",TS:"Telangana",TR:"Tripura",
  UP:"Uttar Pradesh",UK:"Uttarakhand",WB:"West Bengal",DL:"Delhi",
  JK:"Jammu & Kashmir",LA:"Ladakh",AN:"Andaman & Nicobar",CH:"Chandigarh",
  DN:"Dadra & Nagar Haveli",DD:"Daman & Diu",LD:"Lakshadweep",PY:"Puducherry",
};

type Section = "personal" | "location" | "economic" | "documents" | "bank";

interface ProfileData {
  // Personal
  age: string; gender: string; maritalStatus: string; familySize: string; educationLevel: string;
  // Location
  state: string; district: string;
  // Category
  caste_category: string; community: string;
  // Economic
  annual_income: string; bpl_card: boolean; occupation: string;
  land_acres: string; landType: string; houseType: string;
  disabilityStatus: boolean; disabilityPercentage: string;
  // Documents
  aadhaarNo: string; rationCardNo: string; incomeCertNo: string;
  communityCertNo: string; voterId: string;
  // Bank
  bankAccountNo: string; ifscCode: string; bankName: string;
}

const initial: ProfileData = {
  age: "", gender: "", maritalStatus: "", familySize: "", educationLevel: "",
  state: "", district: "", caste_category: "", community: "",
  annual_income: "", bpl_card: false, occupation: "",
  land_acres: "", landType: "", houseType: "",
  disabilityStatus: false, disabilityPercentage: "",
  aadhaarNo: "", rationCardNo: "", incomeCertNo: "", communityCertNo: "", voterId: "",
  bankAccountNo: "", ifscCode: "", bankName: "",
};

export default function ProfileSetupScreen() {
  const { user, setAuth, token, language } = useSessionStore();
  const [data, setData] = useState<ProfileData>(() => {
    if (!user) return initial;
    return {
      age: user.age ? user.age.toString() : "",
      gender: user.gender || "",
      maritalStatus: user.maritalStatus || "",
      familySize: user.familySize ? user.familySize.toString() : "",
      educationLevel: user.educationLevel || "",
      state: user.state || "",
      district: user.district || "",
      caste_category: user.caste_category || "",
      community: user.community || "",
      annual_income: user.annual_income ? user.annual_income.toString() : "",
      bpl_card: !!user.bpl_card,
      occupation: user.occupation || "",
      land_acres: user.land_acres ? user.land_acres.toString() : "",
      landType: user.landType || "",
      houseType: user.houseType || "",
      disabilityStatus: !!user.disabilityStatus,
      disabilityPercentage: user.disabilityPercentage ? user.disabilityPercentage.toString() : "",
      aadhaarNo: user.aadhaarNo || "",
      rationCardNo: user.rationCardNo || "",
      incomeCertNo: user.incomeCertNo || "",
      communityCertNo: user.communityCertNo || "",
      voterId: user.voterId || "",
      bankAccountNo: user.bankAccountNo || "",
      ifscCode: user.ifscCode || "",
      bankName: user.bankName || "",
    };
  });
  const [section, setSection] = useState<Section>("personal");
  const [loading, setLoading] = useState(false);

  // STT / TTS states
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [speakingField, setSpeakingField] = useState<string | null>(null);
  const [fieldLoading, setFieldLoading] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const set = (key: keyof ProfileData, val: any) => setData(prev => ({ ...prev, [key]: val }));

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "personal",  label: "Personal",  icon: "person" },
    { key: "location",  label: "Location",  icon: "location" },
    { key: "economic",  label: "Economic",  icon: "cash" },
    { key: "documents", label: "Documents", icon: "document-text" },
    { key: "bank",      label: "Bank",      icon: "card" },
  ];

  const handleSpeakLabel = async (key: string, labelText: string) => {
    if (speakingField === key) {
      setSpeakingField(null);
      return;
    }
    setSpeakingField(key);
    try {
      const data = await ApiService.getChatTTS(labelText, language?.code || "en-IN");
      if (data.audio) {
        await AudioService.playBase64Audio(data.audio);
      }
    } catch (err) {
      console.warn("TTS failed for label:", labelText, err);
    } finally {
      setSpeakingField(null);
    }
  };

  const handleStartRecording = async (key: keyof ProfileData) => {
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
      setRecordingField(key);
    } catch (err) {
      Alert.alert("Microphone Error", "Could not start recording.");
    }
  };

  const handleStopRecording = async (key: keyof ProfileData) => {
    if (!recordingRef.current) return;
    setRecordingField(null);
    setFieldLoading(key);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error("No audio URI");

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const res = await ApiService.rawTranscribe(base64Audio, language?.code || "en-IN");
      if (res.transcript) {
        let val = res.transcript.trim();
        // Clean up numeric inputs
        if (["age", "familySize", "annual_income", "land_acres", "disabilityPercentage", "aadhaarNo", "rationCardNo", "bankAccountNo"].includes(key)) {
          val = val.replace(/\D/g, "");
        }
        set(key, val);
      }
    } catch (err) {
      Alert.alert("Error", "Could not transcribe audio. Please try typing.");
    } finally {
      setFieldLoading(null);
      recordingRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!data.age || !data.gender || !data.state) {
      return Alert.alert("Required", "Please fill Age, Gender and State at minimum.");
    }
    setLoading(true);
    try {
      await ApiService.updateProfile(user.id, data);
      const meRes = await ApiService.getMe(user.id);
      setAuth(meRes.user, token || "");
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({
    label,
    fieldKey,
    children,
    hideMic = false,
  }: {
    label: string;
    fieldKey: keyof ProfileData;
    children: React.ReactNode;
    hideMic?: boolean;
  }) => {
    const isSpeaking = speakingField === fieldKey;
    const isRecording = recordingField === fieldKey;
    const isLoading = fieldLoading === fieldKey;

    return (
      <View style={s.field}>
        <View style={s.fieldHeaderRow}>
          <Text style={s.fieldLabel}>{label}</Text>
          <View style={s.actionsRow}>
            {/* Speaker Icon */}
            <TouchableOpacity
              onPress={() => handleSpeakLabel(fieldKey, label)}
              style={s.iconBtn}
            >
              <Ionicons
                name={isSpeaking ? "volume-mute" : "volume-high"}
                size={14}
                color={isSpeaking ? "#F5C518" : "#A8D5B5"}
              />
            </TouchableOpacity>

            {/* Mic Icon */}
            {!hideMic && (
              <TouchableOpacity
                onPress={() => {
                  if (isRecording) {
                    handleStopRecording(fieldKey);
                  } else {
                    handleStartRecording(fieldKey);
                  }
                }}
                style={[s.iconBtn, isRecording && s.iconBtnActive]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#F5C518" />
                ) : (
                  <Ionicons
                    name={isRecording ? "mic-off" : "mic"}
                    size={14}
                    color={isRecording ? "#FF3B30" : "#A8D5B5"}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        {children}
      </View>
    );
  };

  const Input = ({ value, onChange, placeholder, keyboard = "default", max }: any) => (
    <TextInput
      style={s.textInput} value={value} onChangeText={onChange}
      placeholder={placeholder} placeholderTextColor="#5a8a6a"
      keyboardType={keyboard} maxLength={max}
    />
  );

  const Picker = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt} style={[s.chip, value === opt && s.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[s.chipText, value === opt && s.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <TouchableOpacity style={s.toggleRow} onPress={() => onChange(!value)}>
      <View style={[s.toggleBox, value && s.toggleBoxOn]}>
        {value && <Ionicons name="checkmark" size={14} color="#0A3728" />}
      </View>
      <Text style={s.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* GramSeva ID Banner */}
      {user?.gramsevaId && (
        <View style={s.idBanner}>
          <Ionicons name="id-card" size={16} color="#F5C518" />
          <Text style={s.idText}>GramSeva ID: <Text style={s.idValue}>{user.gramsevaId}</Text></Text>
        </View>
      )}

      <Text style={s.title}>Complete Your Profile</Text>
      <Text style={s.subtitle}>Required to find eligible government schemes</Text>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sectionBar}>
        {sections.map(sec => (
          <TouchableOpacity
            key={sec.key} style={[s.secTab, section === sec.key && s.secTabActive]}
            onPress={() => setSection(sec.key)}
          >
            <Ionicons name={sec.icon as any} size={14} color={section === sec.key ? "#0A3728" : "#A8D5B5"} />
            <Text style={[s.secTabText, section === sec.key && s.secTabTextActive]}>{sec.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={s.form} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

          {section === "personal" && (
            <>
              <Field label="Age *" fieldKey="age">
                <Input value={data.age} onChange={(v: string) => set("age", v)} placeholder="e.g. 35" keyboard="numeric" max={3} />
              </Field>
              <Field label="Gender *" fieldKey="gender" hideMic>
                <Picker options={["M", "F", "OTHER"]} value={data.gender} onChange={(v) => set("gender", v)} />
              </Field>
              <Field label="Marital Status" fieldKey="maritalStatus" hideMic>
                <Picker options={["Unmarried", "Married", "Widowed", "Divorced"]} value={data.maritalStatus} onChange={(v) => set("maritalStatus", v)} />
              </Field>
              <Field label="Family Size (members)" fieldKey="familySize">
                <Input value={data.familySize} onChange={(v: string) => set("familySize", v)} placeholder="e.g. 4" keyboard="numeric" max={2} />
              </Field>
              <Field label="Education Level" fieldKey="educationLevel" hideMic>
                <Picker options={["No Formal", "5th Pass", "8th Pass", "10th Pass", "12th Pass", "Graduate", "Post Graduate"]}
                  value={data.educationLevel} onChange={(v) => set("educationLevel", v)} />
              </Field>
              <Toggle value={data.disabilityStatus} onChange={(v) => set("disabilityStatus", v)} label="Person with Disability (PwD)" />
              {data.disabilityStatus && (
                <Field label="Disability Percentage (%)" fieldKey="disabilityPercentage">
                  <Input value={data.disabilityPercentage} onChange={(v: string) => set("disabilityPercentage", v)} placeholder="e.g. 40" keyboard="numeric" max={3} />
                </Field>
              )}
            </>
          )}

          {section === "location" && (
            <>
              <Field label="State *" fieldKey="state" hideMic>
                <ScrollView style={{ maxHeight: 200 }}>
                  {STATES.map(code => (
                    <TouchableOpacity
                      key={code} style={[s.stateRow, data.state === code && s.stateRowActive]}
                      onPress={() => set("state", code)}
                    >
                      <Text style={[s.stateText, data.state === code && s.stateTextActive]}>
                        {code} — {STATES_FULL[code]}
                      </Text>
                      {data.state === code && <Ionicons name="checkmark-circle" size={16} color="#F5C518" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>
              <Field label="District" fieldKey="district">
                <Input value={data.district} onChange={(v: string) => set("district", v)} placeholder="e.g. Lucknow" />
              </Field>
              <Field label="House Type" fieldKey="houseType" hideMic>
                <Picker options={["Pucca", "Semi-Pucca", "Kachha"]} value={data.houseType} onChange={(v) => set("houseType", v)} />
              </Field>
            </>
          )}

          {section === "economic" && (
            <>
              <Field label="Category (Caste)" fieldKey="caste_category" hideMic>
                <Picker options={["SC", "ST", "OBC", "GEN", "EWS"]} value={data.caste_category} onChange={(v) => set("caste_category", v)} />
              </Field>
              <Field label="Community / Sub-caste" fieldKey="community">
                <Input value={data.community} onChange={(v: string) => set("community", v)} placeholder="e.g. Kurmi, Yadav, Paraiyar..." />
              </Field>
              <Field label="Annual Family Income (₹)" fieldKey="annual_income">
                <Input value={data.annual_income} onChange={(v: string) => set("annual_income", v)} placeholder="e.g. 120000" keyboard="numeric" />
              </Field>
              <Toggle value={data.bpl_card} onChange={(v) => set("bpl_card", v)} label="I have a BPL / Ration Card" />
              <Field label="Occupation" fieldKey="occupation" hideMic>
                <Picker options={["farmer", "labourer", "business", "student", "govt_employee", "private_employee", "other"]}
                  value={data.occupation} onChange={(v) => set("occupation", v)} />
              </Field>
              <Field label="Agricultural Land (Acres)" fieldKey="land_acres">
                <Input value={data.land_acres} onChange={(v: string) => set("land_acres", v)} placeholder="e.g. 3.5 (enter 0 if none)" keyboard="decimal-pad" />
              </Field>
              <Field label="Land Type" fieldKey="landType" hideMic>
                <Picker options={["Agricultural", "Residential", "Mixed", "None"]} value={data.landType} onChange={(v) => set("landType", v)} />
              </Field>
            </>
          )}

          {section === "documents" && (
            <>
              <View style={s.docNote}>
                <Ionicons name="information-circle" size={16} color="#F5C518" />
                <Text style={s.docNoteText}>Enter document numbers exactly as printed. These are used to verify eligibility for schemes.</Text>
              </View>
              <Field label="Aadhaar Number" fieldKey="aadhaarNo">
                <Input value={data.aadhaarNo} onChange={(v: string) => set("aadhaarNo", v)} placeholder="XXXX XXXX XXXX" keyboard="numeric" max={14} />
              </Field>
              <Field label="Ration Card Number" fieldKey="rationCardNo">
                <Input value={data.rationCardNo} onChange={(v: string) => set("rationCardNo", v)} placeholder="e.g. RC-TN-2022-0123456" />
              </Field>
              <Field label="Income Certificate Number" fieldKey="incomeCertNo">
                <Input value={data.incomeCertNo} onChange={(v: string) => set("incomeCertNo", v)} placeholder="e.g. INC-TN-CHN-2022-001" />
              </Field>
              <Field label="Community / Caste Certificate Number" fieldKey="communityCertNo">
                <Input value={data.communityCertNo} onChange={(v: string) => set("communityCertNo", v)} placeholder="e.g. CC-SC-TN-2020-047" />
              </Field>
              <Field label="Voter ID Number" fieldKey="voterId">
                <Input value={data.voterId} onChange={(v: string) => set("voterId", v)} placeholder="e.g. TML9876543" />
              </Field>
            </>
          )}

          {section === "bank" && (
            <>
              <View style={s.docNote}>
                <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                <Text style={s.docNoteText}>Bank details are required for Direct Benefit Transfer (DBT) schemes.</Text>
              </View>
              <Field label="Bank Account Number" fieldKey="bankAccountNo">
                <Input value={data.bankAccountNo} onChange={(v: string) => set("bankAccountNo", v)} placeholder="Account number" keyboard="numeric" max={18} />
              </Field>
              <Field label="IFSC Code" fieldKey="ifscCode">
                <Input value={data.ifscCode} onChange={(v: string) => set("ifscCode", v.toUpperCase())} placeholder="e.g. SBIN0001234" max={11} />
              </Field>
              <Field label="Bank Name" fieldKey="bankName">
                <Input value={data.bankName} onChange={(v: string) => set("bankName", v)} placeholder="e.g. State Bank of India" />
              </Field>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Save Button */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A3728" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#0A3728" />
              <Text style={s.saveBtnText}>Save & Find Schemes</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A3728" },
  idBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1A5C42", paddingHorizontal: 16, paddingVertical: 10,
  },
  idText: { color: "#A8D5B5", fontSize: 12 },
  idValue: { color: "#F5C518", fontWeight: "700", fontFamily: "monospace" },
  title: { fontSize: 22, fontWeight: "700", color: "#F5C518", paddingHorizontal: 20, paddingTop: 16 },
  subtitle: { fontSize: 13, color: "#A8D5B5", paddingHorizontal: 20, marginBottom: 12 },
  sectionBar: { maxHeight: 52, paddingHorizontal: 16, marginBottom: 4 },
  secTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#112e20", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: "#1e4d35",
  },
  secTabActive: { backgroundColor: "#F5C518", borderColor: "#F5C518" },
  secTabText: { fontSize: 12, fontWeight: "600", color: "#A8D5B5" },
  secTabTextActive: { color: "#0A3728" },
  form: { flex: 1 },
  field: { marginBottom: 18 },
  fieldHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 11, color: "#A8D5B5", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#112e20",
    borderWidth: 1,
    borderColor: "#1e4d35",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: {
    backgroundColor: "#3A1E1E",
    borderColor: "#FF3B30",
  },
  textInput: {
    backgroundColor: "#112e20", borderRadius: 12, borderWidth: 1,
    borderColor: "#1e4d35", paddingHorizontal: 14, paddingVertical: 12,
    color: "#FFFFFF", fontSize: 14,
  },
  chipScroll: { flexDirection: "row" },
  chip: {
    backgroundColor: "#112e20", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: "#1e4d35",
  },
  chipActive: { backgroundColor: "#F5C518", borderColor: "#F5C518" },
  chipText: { fontSize: 13, color: "#A8D5B5", fontWeight: "500" },
  chipTextActive: { color: "#0A3728", fontWeight: "700" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  toggleBox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: "#A8D5B5", alignItems: "center", justifyContent: "center",
  },
  toggleBoxOn: { backgroundColor: "#F5C518", borderColor: "#F5C518" },
  toggleLabel: { fontSize: 14, color: "#c8e6c9" },
  stateRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    marginBottom: 4, backgroundColor: "#112e20",
  },
  stateRowActive: { backgroundColor: "#1A5C42", borderWidth: 1, borderColor: "#F5C518" },
  stateText: { fontSize: 13, color: "#A8D5B5" },
  stateTextActive: { color: "#F5C518", fontWeight: "600" },
  docNote: {
    flexDirection: "row", gap: 8, backgroundColor: "#1A3020", borderRadius: 12,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#2a5a35",
  },
  docNoteText: { flex: 1, fontSize: 12, color: "#A8D5B5", lineHeight: 18 },
  bottomBar: {
    padding: 16, backgroundColor: "#0A3728",
    borderTopWidth: 1, borderTopColor: "#1e4d35",
  },
  saveBtn: {
    backgroundColor: "#F5C518", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#0A3728" },
  skipBtn: { alignItems: "center", marginTop: 10 },
  skipText: { fontSize: 13, color: "#A8D5B5" },
});
