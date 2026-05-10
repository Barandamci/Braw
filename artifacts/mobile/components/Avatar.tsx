import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  isOnline?: boolean;
  isVerified?: boolean;
}

export function Avatar({ uri, name, size = 44, isOnline, isVerified }: AvatarProps) {
  const colors = useColors();
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accent,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                fontSize: size * 0.36,
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {initials}
          </Text>
        )}
      </View>

      {isVerified && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.verified,
              right: -2,
              bottom: isOnline ? 12 : -2,
              width: size * 0.32,
              height: size * 0.32,
              borderRadius: (size * 0.32) / 2,
            },
          ]}
        >
          <Feather name="check" size={size * 0.18} color="#fff" />
        </View>
      )}

      {isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: colors.online,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
              borderColor: colors.background,
              right: -2,
              bottom: -2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  onlineDot: {
    position: "absolute",
    borderWidth: 2,
  },
});
