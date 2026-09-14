import React from "react";
import { View, Text, ViewStyle, StyleProp } from "react-native";
import { Card } from "./card";
import { Button } from "./button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <Card
      variant="bone"
      style={[
        {
          alignItems: "center",
          paddingVertical: 28,
          paddingHorizontal: 20,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: RADIUS.full,
          backgroundColor: isDark ? PALETTE.darkNested : PALETTE.duskViolet,
          borderWidth: BORDERS.default,
          borderColor: isDark ? colors.border : PALETTE.inkBlack,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {icon}
      </View>

      <Text
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 16,
          fontWeight: "800",
          fontFamily: FONTS.display,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 6,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>

      <Text
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 13,
          fontFamily: FONTS.body,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 18,
          marginBottom: actionLabel && onAction ? 18 : 0,
          maxWidth: 260,
        }}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="accent"
          size="sm"
          style={{ minWidth: 140 }}
        />
      )}
    </Card>
  );
}
