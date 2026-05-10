import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";
import type { UserProfile } from "@/context/AuthContext";

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    const q = query(collection(db, "users"), where("username", ">=", text.toLowerCase()), where("username", "<=", text.toLowerCase() + "\uf8ff"));
    const snap = await getDocs(q);
    setResults(
      snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => u.uid !== user?.uid && !u.isBanned && !profile?.blockedUsers?.includes(u.uid))
    );
    setLoading(false);
  };

  const startChat = async (other: UserProfile) => {
    if (!user) return;
    const convoId = [user.uid, other.uid].sort().join("_");
    const ref = doc(db, "conversations", convoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [user.uid, other.uid],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        lastSenderId: "",
      });
    }
    router.replace(`/chat/${convoId}`);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Yeni Mesaj</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Kullanıcı adı ile ara..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
          autoFocus
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => startChat(item)}
            activeOpacity={0.7}
          >
            <Avatar uri={item.photoURL} name={item.displayName} size={48} isVerified={item.isVerified} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.displayName}</Text>
                {item.isAdmin && <BadgeTag type="admin" size="sm" />}
              </View>
              <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>@{item.username}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          search.length >= 2 && !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Kullanıcı bulunamadı</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15 },
  username: { fontSize: 13 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
