import React from "react";
import { View, Text, ViewStyle, StyleProp } from "react-native";
import { Card, type CardVariant } from "./card";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";
import { useAppTheme } from "@/contexts/app-theme-context";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  variant?: CardVariant;
  badgeText?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  iconBg,
  variant = "bone",
  badgeText,
  style,
}: StatCardProps) {
  const { isDark, colors } = useAppTheme();
  const { isSmallDevice } = useResponsive();

  const isLilac = variant === "lilac";
  const primaryTextColor = isLilac || isDark ? PALETTE.boneWhite : PALETTE.inkBlack;
  const mutedTextColor = isLilac || isDark ? "rgba(249, 245, 242, 0.75)" : "rgba(26, 26, 26, 0.65)";
  const iconBorderColor = isLilac || isDark ? colors.border : PALETTE.inkBlack;
  const resolvedIconBg = iconBg || (isDark ? PALETTE.darkNested : PALETTE.boneWhite);

  return (
    <Card variant={variant} style={[{ flex: 1, minHeight: isSmallDevice ? 88 : 100 }, style]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <View
          style={{
            width: isSmallDevice ? 32 : 36,
            height: isSmallDevice ? 32 : 36,
            borderRadius: RADIUS.md,
            backgroundColor: resolvedIconBg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: BORDERS.hairline,
            borderColor: iconBorderColor,
          }}
        >
          {icon}
        </View>
        {badgeText && (
          <View
            style={{
              backgroundColor: PALETTE.hiVisYellow,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: RADIUS.full,
              borderWidth: BORDERS.hairline,
              borderColor: PALETTE.pureBlack,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                fontFamily: FONTS.mono,
                color: PALETTE.pureBlack,
                textTransform: "uppercase",
              }}
            >
              {badgeText}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={{
            fontSize: isSmallDevice ? 22 : 26,
            fontWeight: "800",
            fontFamily: FONTS.mono,
            color: primaryTextColor,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Text>
        {unit && (
          <Text
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: isSmallDevice ? 12 : 14,
              fontWeight: "600",
              fontFamily: FONTS.mono,
              color: mutedTextColor,
            }}
          >
            {unit}
          </Text>
        )}
      </View>

      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={{
          fontSize: isSmallDevice ? 11 : 12,
          fontWeight: "600",
          fontFamily: FONTS.body,
          color: mutedTextColor,
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Card>
  );
}
