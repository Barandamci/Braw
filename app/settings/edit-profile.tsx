import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { uploadMedia } from "@/lib/cloudinary";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateUserProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [photoURL, setPhotoURL] = useState<string | null>(profile?.photoURL || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) {
      setUploading(true);
      try {
        const url = await uploadMedia(res.assets[0].uri, "image");
        setPhotoURL(url);
      } catch {
        Alert.alert("Hata", "Fotoğraf yüklenemedi.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Hata", "Ad Soyad gereklidir.");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({ displayName: displayName.trim(), bio: bio.trim(), photoURL });
      router.back();
    } catch {
      Alert.alert("Hata", "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Profili Düzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <TouchableOpacity style={styles.avatarArea} onPress={pickPhoto} activeOpacity={0.8}>
          {uploading ? (
            <View style={[styles.avatarLoader, { backgroundColor: colors.secondary }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Avatar uri={photoURL} name={profile?.displayName} size={88} />
          )}
          <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={16} color="#fff" />
          </View>
          <Text style={[styles.changePhotoText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
            Fotoğrafı Değiştir
          </Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Ad Soyad</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ad Soyad"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Bio</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card, minHeight: 90 }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular", textAlignVertical: "top" }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Kendinden bahset..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  saveBtn: { fontSize: 16 },
  avatarArea: { alignItems: "center", gap: 8, position: "relative" },
  avatarLoader: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  cameraBtn: { position: "absolute", bottom: 28, right: "35%", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  changePhotoText: { fontSize: 14 },
  form: { gap: 16 },
  label: { fontSize: 13, marginBottom: 6, marginLeft: 4 },
  inputWrapper: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  input: { fontSize: 15 },
});
