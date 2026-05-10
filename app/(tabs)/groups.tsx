import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
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
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";

interface Group {
  id: string;
  name: string;
  description: string;
  photoURL: string | null;
  members: string[];
  admins: string[];
  lastMessage: string;
  lastMessageAt: { seconds: number } | null;
  createdBy: string;
}

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(() => {
    if (!user) return;
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Group)));
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const unsub = loadGroups();
    return () => unsub?.();
  }, [loadGroups]);

  useEffect(() => {
    const interval = setInterval(() => loadGroups(), 60000);
    return () => clearInterval(interval);
  }, [loadGroups]);

  const formatTime = (ts: { seconds: number } | null) => {
    if (!ts) return "";
    const date = new Date(ts.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Az önce";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}d`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}s`;
    return date.toLocaleDateString("tr-TR");
  };

  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/group/${item.id}`)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.photoURL} name={item.name} size={52} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {item.name}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>
        <Text style={[styles.preview, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {item.lastMessage || item.description || `${item.members.length} üye`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Gruplar</Text>
        <TouchableOpacity
          onPress={() => router.push("/new-group")}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="plus" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Henüz grup yok
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-group")}
          >
            <Text style={[styles.startBtnText, { fontFamily: "Inter_600SemiBold" }]}>Grup Oluştur</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 76 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGroups(); }} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  name: { fontSize: 15 },
  time: { fontSize: 12 },
  preview: { fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 16 },
  startBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  startBtnText: { color: "#fff", fontSize: 14 },
});
