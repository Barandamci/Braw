import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { BadgeTag } from "@/components/BadgeTag";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, logOut } = useAuth();

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: logOut },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const MenuItem = ({
    icon,
    label,
    onPress,
    danger,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.secondary }]}>
        <Feather name={icon as "settings"} size={18} color={danger ? colors.destructive : colors.foreground} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Profil</Text>
        <TouchableOpacity onPress={() => router.push("/settings/index")}>
          <Feather name="settings" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 80 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarRow}>
            <Avatar uri={profile?.photoURL} name={profile?.displayName} size={80} isVerified={profile?.isVerified} />
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/settings/edit-profile")}
            >
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameArea}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {profile?.displayName}
              </Text>
              {profile?.isVerified && <BadgeTag type="verified" />}
              {profile?.isAdmin && !profile?.isOwner && <BadgeTag type="admin" />}
              {profile?.isOwner && <BadgeTag type="owner" />}
            </View>
            <Text style={[styles.username, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              @{profile?.username}
            </Text>
            {profile?.bio ? (
              <Text style={[styles.bio, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Menu */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="edit-2" label="Profili Düzenle" onPress={() => router.push("/settings/edit-profile")} />
          {profile?.isAdmin && (
            <MenuItem icon="shield" label="Admin Paneli" onPress={() => router.push("/admin/index")} />
          )}
          <MenuItem icon="log-out" label="Çıkış Yap" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28 },
  profileCard: { margin: 16, borderRadius: 18, padding: 20, alignItems: "center", gap: 12 },
  avatarRow: { position: "relative" },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  nameArea: { alignItems: "center", gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontSize: 22 },
  username: { fontSize: 14 },
  bio: { fontSize: 14, textAlign: "center", marginTop: 4, opacity: 0.8 },
  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15 },
});
