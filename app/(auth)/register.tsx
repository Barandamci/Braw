import React, { useState, useCallback, useRef } from "react";
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

const API_BASE = process.env["EXPO_PUBLIC_API_URL"] ?? "";
const USE_API_OTP = API_BASE !== "" && !API_BASE.includes("localhost");

async function sendOTP(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "OTP gönderilemedi.");
}

async function verifyOTP(email: string, code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kod yanlış.");
}

type Step = "form" | "otp";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, checkUsernameAvailable, checkEmailAvailable } = useAuth();

  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Validation
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleUsernameBlur = useCallback(async () => {
    if (!username) return;
    const available = await checkUsernameAvailable(username.trim());
    setUsernameError(available ? "" : "Bu kullanıcı adı zaten kullanımda.");
  }, [username, checkUsernameAvailable]);

  const handleEmailBlur = useCallback(async () => {
    if (!email) return;
    const available = await checkEmailAvailable(email.trim());
    setEmailError(available ? "" : "Bu e-posta zaten kayıtlı.");
  }, [email, checkEmailAvailable]);

  const startCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
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
      if (USE_API_OTP) {
        await sendOTP(email.trim());
        startCooldown();
        setStep("otp");
      } else {
        await signUp(email.trim(), password, username.trim(), displayName.trim());
      }
    } catch (e: unknown) {
      Alert.alert("Hata", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendOTP(email.trim());
      startCooldown();
      Alert.alert("Gönderildi", "Yeni kod e-postana gönderildi.");
    } catch (e: unknown) {
      Alert.alert("Hata", (e as Error).message);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[idx] = digit;
    setOtpDigits(newDigits);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: { nativeEvent: { key: string } }, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyAndRegister = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      Alert.alert("Hata", "6 haneli kodu girin.");
      return;
    }

    setOtpLoading(true);
    try {
      await verifyOTP(email.trim(), code);
      await signUp(email.trim(), password, username.trim(), displayName.trim());
    } catch (e: unknown) {
      Alert.alert("Hata", (e as Error).message);
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── OTP Step ────────────────────────────────────────────────
  if (step === "otp") {
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
            <TouchableOpacity onPress={() => setStep("form")} style={styles.back}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.otpIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="mail" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                E-postanı Doğrula
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
                {"\n"}adresine 6 haneli kod gönderdik
              </Text>
            </View>

            {/* OTP Boxes */}
            <View style={styles.otpRow}>
              {otpDigits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { otpRefs.current[i] = r; }}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: d ? colors.primary : colors.border,
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                  value={d}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={(e) => handleOtpKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: colors.primary },
                otpLoading && { opacity: 0.7 },
              ]}
              onPress={handleVerifyAndRegister}
              disabled={otpLoading}
              activeOpacity={0.8}
            >
              {otpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Doğrula ve Kayıt Ol
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              style={{ marginTop: 20, alignItems: "center" }}
            >
              <Text
                style={[
                  styles.resendText,
                  {
                    color: resendCooldown > 0 ? colors.mutedForeground : colors.primary,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {resendCooldown > 0 ? `Tekrar gönder (${resendCooldown}s)` : "Kodu tekrar gönder"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Form Step ───────────────────────────────────────────────
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
              colors={colors}
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
              colors={colors}
            />

            <InputField
              icon="mail"
              placeholder="E-posta"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(""); }}
              onBlur={handleEmailBlur}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              colors={colors}
            />

            <InputField
              icon="lock"
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              colors={colors}
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
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Devam Et
                </Text>
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

type Colors = ReturnType<typeof useColors>;

function InputField({
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
  colors,
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
  colors: Colors;
}) {
  return (
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
        <Feather
          name={icon as "user"}
          size={18}
          color={error ? colors.destructive : colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
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
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 28, flexGrow: 1 },
  back: { marginBottom: 24, alignSelf: "flex-start" },
  header: { marginBottom: 32, gap: 8 },
  otpIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 28 },
  subtitle: { fontSize: 14, lineHeight: 22 },
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
    marginTop: 8,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
  },
  resendText: { fontSize: 14 },
});
