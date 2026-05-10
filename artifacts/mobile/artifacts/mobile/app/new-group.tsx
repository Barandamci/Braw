import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import type { UserProfile } from "@/context/AuthContext";

export default function NewGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    const q = query(collection(db, "users"), where("username", ">=", text.toLowerCase()), where("username", "<=", text.toLowerCase() + "\uf8ff"));
    const snap = await getDocs(q);
    setResults(snap.docs.map((d) => d.data() as UserProfile).filter((u) => u.uid !== user?.uid));
    setLoading(false);
  };

  const toggleSelect = (u: UserProfile) => {
    if (selected.find((s) => s.uid === u.uid)) {
      setSelected(selected.filter((s) => s.uid !== u.uid));
    } else {
      setSelected([...selected, u]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert("Hata", "Grup adı gerekli."); return; }
    if (selected.length < 1) { Alert.alert("Hata", "En az 1 üye seç."); return; }
    if (!user) return;

    setCreating(true);
    try {
      const members = [user.uid, ...selected.map((u) => u.uid)];
      await addDoc(collection(db, "groups"), {
        name: groupName.trim(),
        description: description.trim(),
        photoURL: null,
        members,
        admins: [user.uid],
        createdBy: user.uid,
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      router.replace("/(tabs)/groups");
    } catch {
      Alert.alert("Hata", "Grup oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Yeni Grup</Text>
        <TouchableOpacity onPress={createGroup} disabled={creating}>
          {creating ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <Text style={[styles.createBtn, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ padding: 16, gap: 12 }}>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="users" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Grup Adı"
              placeholderTextColor={colors.mutedForeground}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="info" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Açıklama (isteğe bağlı)"
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {selected.length > 0 && (
          <ScrollView horizontal style={{ paddingHorizontal: 16, paddingBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
            {selected.map((u) => (
              <TouchableOpacity key={u.uid} onPress={() => toggleSelect(u)} style={styles.selectedChip}>
                <Avatar uri={u.photoURL} name={u.displayName} size={32} />
                <Feather name="x" size={12} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Üye ekle (kullanıcı adı)"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={(u) => u.uid}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isSelected = !!selected.find((s) => s.uid === item.uid);
            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => toggleSelect(item)}
                activeOpacity={0.7}
              >
                <Avatar uri={item.photoURL} name={item.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.displayName}</Text>
                  <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>@{item.username}</Text>
                </View>
                <View style={[styles.checkCircle, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" }]}>
                  {isSelected && <Feather name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  createBtn: { fontSize: 16 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  selectedChip: { alignItems: "center", gap: 4 },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, gap: 10, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15 },
  username: { fontSize: 13 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
