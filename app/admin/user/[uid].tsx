import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";
import type { UserProfile } from "@/context/AuthContext";

const OWNER_EMAIL = "barandamci@icloud.com";

interface ConversationPreview {
  id: string;
  otherUser: UserProfile | null;
  lastMessage: string;
  lastMessageAt: { seconds: number } | null;
}

export default function AdminUserScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile: adminProfile } = useAuth();

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [banReason, setBanReason] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "messages">("info");

  const isOwnerTarget = targetUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const canModify = adminProfile?.isOwner || (!isOwnerTarget && !targetUser?.isOwner);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        const u = snap.data() as UserProfile;
        setTargetUser(u);
        setBanReason(u.banReason || "");
        setNewUsername(u.username);
      }
      setLoading(false);
    });

    getDocs(query(collection(db, "conversations"), where("participants", "array-contains", uid))).then(
      async (snap) => {
        const convs: ConversationPreview[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          const otherId = data.participants?.find((p: string) => p !== uid);
          let otherUser: UserProfile | null = null;
          if (otherId) {
            const u = await getDoc(doc(db, "users", otherId));
            if (u.exists()) otherUser = u.data() as UserProfile;
          }
          convs.push({ id: d.id, otherUser, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt });
        }
        setConversations(convs);
      }
    );
  }, [uid]);

  const toggleBan = async () => {
    if (!uid || !canModify) return;
    if (!targetUser?.isBanned && !banReason.trim()) {
      Alert.alert("Hata", "Banlama için açıklama girin.");
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, "users", uid), {
      isBanned: !targetUser?.isBanned,
      banReason: !targetUser?.isBanned ? banReason : null,
    });
    setTargetUser((prev) => prev ? { ...prev, isBanned: !prev.isBanned, banReason: !prev.isBanned ? banReason : null } : prev);
    setSaving(false);
  };

  const toggleAdmin = async () => {
    if (!uid || !canModify) return;
    if (isOwnerTarget) return;
    setSaving(true);
    const newVal = !targetUser?.isAdmin;
    await updateDoc(doc(db, "users", uid), { isAdmin: newVal });
    setTargetUser((prev) => prev ? { ...prev, isAdmin: newVal } : prev);
    setSaving(false);
  };

  const toggleVerified = async () => {
    if (!uid || !canModify) return;
    setSaving(true);
    const newVal = !targetUser?.isVerified;
    await updateDoc(doc(db, "users", uid), { isVerified: newVal });
    setTargetUser((prev) => prev ? { ...prev, isVerified: newVal } : prev);
    setSaving(false);
  };

  const saveUsername = async () => {
    if (!uid || !canModify || !newUsername.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, "users", uid), { username: newUsername.toLowerCase().trim() });
    setTargetUser((prev) => prev ? { ...prev, username: newUsername.toLowerCase().trim() } : prev);
    setSaving(false);
    Alert.alert("Kaydedildi", "Kullanıcı adı güncellendi.");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Kullanıcı Yönet</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* User info bar */}
      <View style={[styles.userBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Avatar uri={targetUser?.photoURL} name={targetUser?.displayName} size={52} isVerified={targetUser?.isVerified} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={[styles.displayName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{targetUser?.displayName}</Text>
            {targetUser?.isOwner && <BadgeTag type="owner" size="sm" />}
            {targetUser?.isAdmin && !targetUser?.isOwner && <BadgeTag type="admin" size="sm" />}
            {targetUser?.isVerified && <BadgeTag type="verified" />}
            {targetUser?.isBanned && <BadgeTag type="banned" size="sm" />}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>@{targetUser?.username}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["info", "messages"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
              {t === "info" ? "Bilgiler" : "Mesajlar"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "info" ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {!canModify && (
            <View style={[styles.notice, { backgroundColor: colors.admin + "22", borderColor: colors.admin }]}>
              <Feather name="shield" size={16} color={colors.admin} />
              <Text style={[styles.noticeText, { color: colors.admin, fontFamily: "Inter_500Medium" }]}>Owner hesabı değiştirilemez</Text>
            </View>
          )}

          {/* Username change */}
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Kullanıcı Adı</Text>
            <View style={[styles.inputRow, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 }]}
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={saveUsername} disabled={saving || !canModify} style={[styles.smallBtn, { backgroundColor: colors.primary, opacity: canModify ? 1 : 0.4 }]}>
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>İşlemler</Text>

            <ActionRow
              label={targetUser?.isVerified ? "Mavi Tiki Kaldır" : "Mavi Tik Ver"}
              icon="check-circle"
              color={colors.verified}
              onPress={toggleVerified}
              disabled={!canModify}
            />
            <ActionRow
              label={targetUser?.isAdmin ? "Admin'i Kaldır" : "Admin Yap"}
              icon="shield"
              color={colors.admin}
              onPress={toggleAdmin}
              disabled={!canModify || isOwnerTarget}
            />
          </View>

          {/* Ban section */}
          <View style={[styles.section, { borderColor: targetUser?.isBanned ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Ban Yönetimi</Text>
            {!targetUser?.isBanned && (
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="Ban açıklaması..."
                  placeholderTextColor={colors.mutedForeground}
                  value={banReason}
                  onChangeText={setBanReason}
                  multiline
                />
              </View>
            )}
            {targetUser?.isBanned && targetUser.banReason && (
              <Text style={[styles.banReason, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                Neden: {targetUser.banReason}
              </Text>
            )}
            <ActionRow
              label={targetUser?.isBanned ? "Banı Kaldır" : "Banla"}
              icon={targetUser?.isBanned ? "user-check" : "user-x"}
              color={targetUser?.isBanned ? colors.success : colors.destructive}
              onPress={toggleBan}
              disabled={!canModify}
            />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.convRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/admin/messages/${item.id}?viewUid=${uid}`)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.otherUser?.photoURL} name={item.otherUser?.displayName} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.convName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {item.otherUser?.displayName || "Kullanıcı"}
                </Text>
                <Text style={[styles.convPreview, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {item.lastMessage || "Medya"}
                </Text>
              </View>
              <Feather name="eye" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Mesaj yok</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ActionRow({ label, icon, color, onPress, disabled }: { label: string; icon: string; color: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.actionRow, { opacity: disabled ? 0.4 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Feather name={icon as "shield"} size={18} color={color} />
      <Text style={[styles.actionLabel, { color, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  userBar: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1 },
  displayName: { fontSize: 16 },
  username: { fontSize: 13 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden", padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  inputWrapper: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  input: { fontSize: 14 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  actionLabel: { flex: 1, fontSize: 14 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  noticeText: { fontSize: 13 },
  banReason: { fontSize: 13, fontStyle: "italic" },
  convRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  convName: { fontSize: 15 },
  convPreview: { fontSize: 13 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
