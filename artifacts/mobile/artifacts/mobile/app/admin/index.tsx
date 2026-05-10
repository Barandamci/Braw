import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";
import type { UserProfile } from "@/context/AuthContext";

export default function AdminPanelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.isAdmin) { router.replace("/(tabs)"); return; }
    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))).then((snap) => {
      const all = snap.docs.map((d) => d.data() as UserProfile);
      setUsers(all);
      setFiltered(all);
      setLoading(false);
    });
  }, [profile]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text) { setFiltered(users); return; }
    const lower = text.toLowerCase();
    setFiltered(users.filter((u) => u.username.includes(lower) || u.displayName.toLowerCase().includes(lower)));
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderUser = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/admin/user/${item.uid}`)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.photoURL} name={item.displayName} size={48} isVerified={item.isVerified} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.displayName}</Text>
          {item.isOwner && <BadgeTag type="owner" size="sm" />}
          {item.isAdmin && !item.isOwner && <BadgeTag type="admin" size="sm" />}
          {item.isVerified && <BadgeTag type="verified" />}
          {item.isBanned && <BadgeTag type="banned" size="sm" />}
        </View>
        <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>@{item.username}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Admin Paneli</Text>
        <Feather name="shield" size={20} color={colors.admin} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Kullanıcı ara..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={renderUser}
          ListHeaderComponent={
            <View style={{ padding: 16, paddingBottom: 8 }}>
              <Text style={[styles.statText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {filtered.length} kullanıcı
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20 },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15 },
  username: { fontSize: 13 },
  statText: { fontSize: 13 },
});
