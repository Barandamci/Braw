import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayRemove,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { uploadMedia } from "@/lib/cloudinary";
import type { UserProfile } from "@/context/AuthContext";

interface Message {
  id: string;
  senderId: string;
  text: string;
  senderName?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: { seconds: number } | null;
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  photoURL: string | null;
  members: string[];
  admins: string[];
  createdBy: string;
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;

    getDoc(doc(db, "groups", id)).then(async (snap) => {
      if (snap.exists()) {
        const data = { ...snap.data(), id: snap.id } as GroupData;
        setGroup(data);
        const profiles: Record<string, UserProfile> = {};
        await Promise.all(
          data.members.map(async (uid) => {
            const u = await getDoc(doc(db, "users", uid));
            if (u.exists()) profiles[uid] = u.data() as UserProfile;
          })
        );
        setMemberProfiles(profiles);
      }
    });

    const q = query(collection(db, "groups", id, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Message)));
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const sendMessage = useCallback(async (msgText?: string, imageUrl?: string, videoUrl?: string) => {
    if (!user || !id || !group) return;
    const content = msgText?.trim() || "";
    if (!content && !imageUrl && !videoUrl) return;

    setSending(true);
    try {
      const senderProfile = memberProfiles[user.uid];
      const msgData: Record<string, unknown> = {
        senderId: user.uid,
        senderName: senderProfile?.displayName || "Kullanıcı",
        text: content,
        createdAt: serverTimestamp(),
      };
      if (imageUrl) msgData.imageUrl = imageUrl;
      if (videoUrl) msgData.videoUrl = videoUrl;

      await addDoc(collection(db, "groups", id, "messages"), msgData);
      await updateDoc(doc(db, "groups", id), {
        lastMessage: imageUrl ? "📷 Fotoğraf" : videoUrl ? "🎥 Video" : content,
        lastMessageAt: serverTimestamp(),
      });
      setText("");
    } catch {
      Alert.alert("Hata", "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  }, [user, id, group, memberProfiles]);

  const pickMedia = async (type: "image" | "video") => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === "image" ? ["images"] : ["videos"],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setSending(true);
      try {
        const url = await uploadMedia(res.assets[0].uri, type);
        await sendMessage("", type === "image" ? url : undefined, type === "video" ? url : undefined);
      } catch {
        Alert.alert("Hata", "Medya yüklenemedi.");
        setSending(false);
      }
    }
  };

  const leaveGroup = () => {
    Alert.alert("Gruptan Ayrıl", "Gruptan ayrılmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: async () => {
          if (!user || !id) return;
          await updateDoc(doc(db, "groups", id), { members: arrayRemove(user.uid) });
          router.replace("/(tabs)/groups");
        },
      },
    ]);
  };

  const formatTime = (ts: { seconds: number } | null) => {
    if (!ts) return "";
    return new Date(ts.seconds * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.uid;
    const sender = memberProfiles[item.senderId];
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && <Avatar uri={sender?.photoURL} name={sender?.displayName} size={28} />}
        <View style={[styles.bubble, { backgroundColor: isMine ? colors.bubble : colors.bubbleOther, borderRadius: colors.radius }]}>
          {!isMine && (
            <Text style={[styles.senderName, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {item.senderName || sender?.displayName}
            </Text>
          )}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
          ) : item.videoUrl ? (
            <View style={[styles.videoPlaceholder, { backgroundColor: colors.secondary }]}>
              <Feather name="video" size={32} color={colors.primary} />
            </View>
          ) : (
            <Text style={[styles.msgText, { color: isMine ? colors.bubbleForeground : colors.bubbleOtherForeground, fontFamily: "Inter_400Regular" }]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.msgTime, { color: isMine ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar uri={group?.photoURL} name={group?.name} size={36} />
          <View>
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{group?.name}</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {group?.members.length || 0} üye
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={leaveGroup}>
          <Feather name="log-out" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 8 }]}>
          <TouchableOpacity onPress={() => pickMedia("image")} style={styles.mediaBtn}>
            <Feather name="image" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickMedia("video")} style={styles.mediaBtn}>
            <Feather name="video" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.secondary, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !text.trim() ? 0.5 : 1 }]}
            onPress={() => sendMessage(text)}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1 },
  headerName: { fontSize: 15 },
  headerSub: { fontSize: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  senderName: { fontSize: 12, marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: "flex-end" },
  msgImage: { width: 220, height: 160, borderRadius: 10 },
  videoPlaceholder: { width: 220, height: 120, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  mediaBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
