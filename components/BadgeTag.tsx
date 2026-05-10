import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface BadgeTagProps {
  type: "admin" | "owner" | "verified" | "banned";
  size?: "sm" | "md";
}

export function BadgeTag({ type, size = "sm" }: BadgeTagProps) {
  const colors = useColors();

  const config = {
    admin: { label: "Admin", color: colors.admin, icon: "shield" as const },
    owner: { label: "Owner", color: colors.owner, icon: "star" as const },
    verified: { label: "", color: colors.verified, icon: "check-circle" as const },
    banned: { label: "Banned", color: colors.destructive, icon: "slash" as const },
  };

  const c = config[type];
  const fontSize = size === "sm" ? 10 : 12;
  const iconSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? { paddingHorizontal: 6, paddingVertical: 2 } : { paddingHorizontal: 8, paddingVertical: 3 };

  if (type === "verified") {
    return <Feather name="check-circle" size={14} color={c.color} />;
  }

  return (
    <View style={[styles.badge, padding, { backgroundColor: c.color + "22", borderColor: c.color + "44" }]}>
      <Feather name={c.icon} size={iconSize} color={c.color} />
      {c.label ? (
        <Text style={[styles.label, { color: c.color, fontSize }]}>{c.label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
  },
});
