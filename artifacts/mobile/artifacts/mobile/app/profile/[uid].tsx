import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";
import type { UserProfile } from "@/context/AuthContext";

export default function ProfileDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile, updateUserProfile } = useAuth();

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isBlocked = profile?.blockedUsers?.includes(uid || "");

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) setTargetUser(snap.data() as UserProfile);
      setLoading(false);
    });
  }, [uid]);

  const startChat = async () => {
    if (!user || !uid) return;
    const convoId = [user.uid, uid].sort().join("_");
    const ref = doc(db, "conversations", convoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [user.uid, uid],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        lastSenderId: "",
      });
    }
    router.push(`/chat/${convoId}`);
  };

  const toggleBlock = async () => {
    if (!uid) return;
    if (isBlocked) {
      await updateUserProfile({ blockedUsers: profile?.blockedUsers?.filter((b) => b !== uid) });
    } else {
      Alert.alert("Engelle", `@${targetUser?.username} kullanıcısını engellemek istiyor musun?`, [
        { text: "İptal", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: async () => {
            await updateUserProfile({ blockedUsers: [...(profile?.blockedUsers || []), uid] });
          },
        },
      ]);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />
      </View>
    );
  }

  const isSelf = uid === user?.uid;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Profil</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Avatar uri={targetUser?.photoURL} name={targetUser?.displayName} size={88} isVerified={targetUser?.isVerified} />
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {targetUser?.displayName}
            </Text>
            {targetUser?.isVerified && <BadgeTag type="verified" />}
            {targetUser?.isOwner && <BadgeTag type="owner" />}
            {targetUser?.isAdmin && !targetUser?.isOwner && <BadgeTag type="admin" />}
            {targetUser?.isBanned && <BadgeTag type="banned" />}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            @{targetUser?.username}
          </Text>
          {targetUser?.bio ? (
            <Text style={[styles.bio, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              {targetUser.bio}
            </Text>
          ) : (
            <Text style={[styles.bio, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Bio yok
            </Text>
          )}
        </View>

        {!isSelf && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={startChat}
              activeOpacity={0.8}
            >
              <Feather name="message-circle" size={18} color="#fff" />
              <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Mesaj Gönder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isBlocked ? colors.success + "22" : colors.destructive + "15", borderWidth: 1, borderColor: isBlocked ? colors.success : colors.destructive }]}
              onPress={toggleBlock}
              activeOpacity={0.8}
            >
              <Feather name={isBlocked ? "user-check" : "user-x"} size={18} color={isBlocked ? colors.success : colors.destructive} />
              <Text style={[styles.actionBtnText, { color: isBlocked ? colors.success : colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                {isBlocked ? "Engeli Kaldır" : "Engelle"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  card: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  displayName: { fontSize: 22 },
  username: { fontSize: 14 },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  actions: { gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  actionBtnText: { color: "#fff", fontSize: 15 },
});
