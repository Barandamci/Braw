import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, checkUsernameAvailable, checkEmailAvailable } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleUsernameBlur = useCallback(async () => {
    if (!username) return;
    const available = await checkUsernameAvailable(username.trim());
    if (!available) {
      setUsernameError("Bu kullanıcı adı zaten kullanımda.");
    } else {
      setUsernameError("");
    }
  }, [username, checkUsernameAvailable]);

  const handleEmailBlur = useCallback(async () => {
    if (!email) return;
    const available = await checkEmailAvailable(email.trim());
    if (!available) {
      setEmailError("Bu e-posta zaten kayıtlı.");
    } else {
      setEmailError("");
    }
  }, [email, checkEmailAvailable]);

  const handleRegister = async () => {
    if (!displayName || !username || !email || !password) {
      Alert.alert("Hata", "Tüm alanları doldurun.");
      return;
    }
    if (usernameError || emailError) {
      Alert.alert("Hata", "Lütfen hataları düzeltin.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalı.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim(), displayName.trim());
    } catch (e: unknown) {
      const err = e as { code?: string };
      const msg =
        err.code === "auth/email-already-in-use"
          ? "Bu e-posta zaten kullanımda."
          : "Kayıt başarısız. Tekrar dene.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({
    icon,
    placeholder,
    value,
    onChangeText,
    onBlur,
    error,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    autoComplete,
    rightEl,
  }: {
    icon: string;
    placeholder: string;
    value: string;
    onChangeText: (v: string) => void;
    onBlur?: () => void;
    error?: string;
    secureTextEntry?: boolean;
    keyboardType?: "email-address" | "default";
    autoCapitalize?: "none" | "words";
    autoComplete?: "email" | "password" | "username" | "name";
    rightEl?: React.ReactNode;
  }) => (
    <View>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? colors.destructive : colors.border,
            backgroundColor: error ? colors.destructive + "10" : colors.card,
          },
        ]}
      >
        <Feather name={icon as "user"} size={18} color={error ? colors.destructive : colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={(t) => {
            onChangeText(t);
          }}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
        />
        {rightEl}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Hesap Oluştur
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Braw'a katıl ve mesajlaşmaya başla
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              icon="user"
              placeholder="Ad Soyad"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />

            <InputField
              icon="at-sign"
              placeholder="Kullanıcı adı"
              value={username}
              onChangeText={(t) => {
                setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
                setUsernameError("");
              }}
              onBlur={handleUsernameBlur}
              error={usernameError}
              autoCapitalize="none"
              autoComplete="username"
            />

            <InputField
              icon="mail"
              placeholder="E-posta"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailError("");
              }}
              onBlur={handleEmailBlur}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <InputField
              icon="lock"
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              rightEl={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>Kayıt Ol</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Zaten hesabın var mı?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={[styles.link, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 28, flexGrow: 1 },
  back: { marginBottom: 24, alignSelf: "flex-start" },
  header: { marginBottom: 32 },
  title: { fontSize: 28, marginBottom: 6 },
  subtitle: { fontSize: 14 },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14 },
});
