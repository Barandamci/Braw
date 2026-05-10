import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import type { UserProfile } from "@/context/AuthContext";

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: { seconds: number } | null;
}

export default function AdminMessagesScreen() {
  const { convId, viewUid } = useLocalSearchParams<{ convId: string; viewUid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!convId) return;

    getDoc(doc(db, "conversations", convId)).then(async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const profiles: Record<string, UserProfile> = {};
        if (data.participants) {
          await Promise.all(
            data.participants.map(async (uid: string) => {
              const u = await getDoc(doc(db, "users", uid));
              if (u.exists()) profiles[uid] = u.data() as UserProfile;
            })
          );
          setParticipants(profiles);
        }
      }
    });

    const q = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Message)));
      setLoading(false);
    });
    return unsub;
  }, [convId]);

  const viewUser = participants[viewUid || ""];
  const formatTime = (ts: { seconds: number } | null) => {
    if (!ts) return "";
    return new Date(ts.seconds * 1000).toLocaleString("tr-TR");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Avatar uri={viewUser?.photoURL} name={viewUser?.displayName} size={32} />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {viewUser?.displayName || "Kullanıcı"}
          </Text>
        </View>
        <View style={[styles.adminBadge, { backgroundColor: colors.admin + "22" }]}>
          <Feather name="eye" size={14} color={colors.admin} />
          <Text style={[styles.adminBadgeText, { color: colors.admin, fontFamily: "Inter_600SemiBold" }]}>Admin</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const isViewUser = item.senderId === viewUid;
            const sender = participants[item.senderId];
            return (
              <View style={[styles.msgRow, isViewUser ? styles.msgRowRight : styles.msgRowLeft]}>
                {!isViewUser && <Avatar uri={sender?.photoURL} name={sender?.displayName} size={28} />}
                <View style={[styles.bubble, {
                  backgroundColor: isViewUser ? colors.bubble : colors.bubbleOther,
                  borderRadius: colors.radius,
                }]}>
                  {!isViewUser && (
                    <Text style={[styles.senderName, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                      {sender?.displayName}
                    </Text>
                  )}
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
                  ) : (
                    <Text style={[styles.msgText, { color: isViewUser ? colors.bubbleForeground : colors.bubbleOtherForeground, fontFamily: "Inter_400Regular" }]}>
                      {item.text}
                    </Text>
                  )}
                  <Text style={[styles.msgTime, { color: isViewUser ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ padding: 12, gap: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 15 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  adminBadgeText: { fontSize: 11 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  senderName: { fontSize: 11, marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: "flex-end" },
  msgImage: { width: 200, height: 150, borderRadius: 10 },
});
