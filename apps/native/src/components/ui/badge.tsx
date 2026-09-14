import React from "react";
import { View, Text, ViewStyle, TextStyle, StyleProp } from "react-native";
import { PALETTE, RADIUS, BORDERS, FONTS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export type BadgeVariant =
  | "present"
  | "missed"
  | "live"
  | "upcoming"
  | "offline"
  | "neutral"
  | "warning";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  variant = "neutral",
  size = "md",
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const { isDark } = useAppTheme();

  let backgroundColor: string;
  let borderColor: string;
  let textColor: string;

  switch (variant) {
    case "present":
      backgroundColor = PALETTE.matchaCream;
      borderColor = PALETTE.inkBlack;
      textColor = PALETTE.pureBlack;
      break;
    case "missed":
      backgroundColor = PALETTE.firecrackerRed;
      borderColor = PALETTE.boneWhite;
      textColor = PALETTE.boneWhite;
      break;
    case "live":
      backgroundColor = PALETTE.hiVisYellow;
      borderColor = PALETTE.pureBlack;
      textColor = PALETTE.pureBlack;
      break;
    case "upcoming":
      backgroundColor = PALETTE.lilacShadow;
      borderColor = PALETTE.boneWhite;
      textColor = PALETTE.boneWhite;
      break;
    case "offline":
      backgroundColor = PALETTE.butteryYellow;
      borderColor = PALETTE.inkBlack;
      textColor = PALETTE.inkBlack;
      break;
    case "warning":
      backgroundColor = PALETTE.firecrackerRed;
      borderColor = PALETTE.pureWhite;
      textColor = PALETTE.pureWhite;
      break;
    case "neutral":
    default:
      backgroundColor = isDark ? "rgba(249, 245, 242, 0.12)" : PALETTE.boneWhite;
      borderColor = isDark ? "rgba(249, 245, 242, 0.25)" : PALETTE.inkBlack;
      textColor = isDark ? PALETTE.boneWhite : PALETTE.inkBlack;
      break;
  }

  const isSmall = size === "sm";

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          backgroundColor,
          borderWidth: BORDERS.hairline,
          borderColor,
          borderRadius: RADIUS.full,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
          gap: 4,
        },
        style,
      ]}
    >
      {variant === "live" && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: PALETTE.firecrackerRed,
          }}
        />
      )}
      {icon}
      <Text
        maxFontSizeMultiplier={1.2}
        style={[
          {
            color: textColor,
            fontSize: isSmall ? 10 : 11,
            fontWeight: "700",
            fontFamily: FONTS.mono,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
