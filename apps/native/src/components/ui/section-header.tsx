import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";

interface SectionHeaderProps {
  title: string;
  badge?: string | number;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  inverted?: boolean;
}

export function SectionHeader({
  title,
  badge,
  actionLabel,
  onAction,
  style,
  inverted = false,
}: SectionHeaderProps) {
  const textColor = inverted ? PALETTE.inkBlack : PALETTE.boneWhite;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 16,
            fontWeight: "800",
            fontFamily: FONTS.display,
            color: textColor,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </Text>
        {badge !== undefined && (
          <View
            style={{
              backgroundColor: PALETTE.hiVisYellow,
              paddingHorizontal: 7,
              paddingVertical: 1,
              borderRadius: RADIUS.full,
              borderWidth: BORDERS.hairline,
              borderColor: PALETTE.pureBlack,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                fontFamily: FONTS.mono,
                color: PALETTE.pureBlack,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      {actionLabel && onAction && (
        <TouchableOpacity activeOpacity={0.7} onPress={onAction}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: 12,
              fontWeight: "700",
              fontFamily: FONTS.mono,
              color: PALETTE.hiVisYellow,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {actionLabel} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
