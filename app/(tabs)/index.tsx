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
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";
import type { UserProfile } from "@/context/AuthContext";

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: { seconds: number } | null;
  lastSenderId: string;
  otherUser?: UserProfile;
  unreadCount?: number;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const convs: Conversation[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Conversation;
        const otherId = data.participants.find((p) => p !== user.uid);
        if (otherId) {
          const userSnap = await getDoc(doc(db, "users", otherId));
          if (userSnap.exists()) {
            data.otherUser = userSnap.data() as UserProfile;
          }
        }
        if (data.otherUser?.blockedUsers?.includes(user.uid)) continue;
        if (profile?.blockedUsers?.includes(otherId || "")) continue;
        convs.push({ ...data, id: d.id });
      }
      setConversations(convs);
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, [user, profile]);

  useEffect(() => {
    const unsub = loadConversations();
    return () => unsub?.();
  }, [loadConversations]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadConversations]);

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

  const renderItem = ({ item }: { item: Conversation }) => {
    const other = item.otherUser;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <Avatar
          uri={other?.photoURL}
          name={other?.displayName}
          size={52}
          isVerified={other?.isVerified}
        />
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {other?.displayName || "Kullanıcı"}
              </Text>
              {other?.isAdmin && <BadgeTag type="admin" size="sm" />}
              {other?.isOwner && <BadgeTag type="owner" size="sm" />}
            </View>
            <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <Text
            style={[styles.preview, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {item.lastSenderId === user?.uid ? "Sen: " : ""}
            {item.lastMessage || "Medya"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Mesajlar</Text>
        <TouchableOpacity
          onPress={() => router.push("/new-chat")}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Henüz mesaj yok
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-chat")}
          >
            <Text style={[styles.startBtnText, { fontFamily: "Inter_600SemiBold" }]}>Konuşma Başlat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 76 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConversations();
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15 },
  time: { fontSize: 12 },
  preview: { fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 16 },
  startBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  startBtnText: { color: "#fff", fontSize: 14 },
});
