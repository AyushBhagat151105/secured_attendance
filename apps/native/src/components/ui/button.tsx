import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import * as Haptics from "expo-haptics";
import { PALETTE, RADIUS, BORDERS, FONTS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";

export type ButtonVariant = "primary" | "accent" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  style,
  labelStyle,
}: ButtonProps) {
  const { isSmallDevice } = useResponsive();

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // Haptics unavailable on some devices
    }
    onPress();
  };

  let backgroundColor: string;
  let borderColor: string;
  let textColor: string;

  switch (variant) {
    case "accent":
      backgroundColor = PALETTE.hiVisYellow;
      borderColor = PALETTE.pureBlack;
      textColor = PALETTE.pureBlack;
      break;
    case "destructive":
      backgroundColor = PALETTE.firecrackerRed;
      borderColor = PALETTE.boneWhite;
      textColor = PALETTE.boneWhite;
      break;
    case "secondary":
      backgroundColor = PALETTE.lilacShadow;
      borderColor = PALETTE.boneWhite;
      textColor = PALETTE.boneWhite;
      break;
    case "ghost":
      backgroundColor = "transparent";
      borderColor = PALETTE.boneWhite;
      textColor = PALETTE.boneWhite;
      break;
    case "primary":
    default:
      backgroundColor = PALETTE.boneWhite;
      borderColor = PALETTE.inkBlack;
      textColor = PALETTE.inkBlack;
      break;
  }

  // Min touch target 44pt (Apple / Android accessibility guideline)
  const minHeight = size === "sm" ? 38 : size === "lg" ? 52 : 46;
  const paddingHorizontal = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  const buttonStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight,
    paddingHorizontal,
    paddingVertical: isSmallDevice ? 8 : 10,
    backgroundColor,
    borderWidth: BORDERS.default,
    borderColor,
    borderRadius: RADIUS.md,
    opacity: disabled ? 0.5 : 1,
    shadowColor: PALETTE.pureBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  };

  const textStyle: TextStyle = {
    color: textColor,
    fontSize,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: FONTS.body,
    textAlign: "center",
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && iconPosition === "left" ? icon : null}
          <Text
            maxFontSizeMultiplier={1.25}
            style={[textStyle, labelStyle]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {icon && iconPosition === "right" ? icon : null}
        </>
      )}
    </TouchableOpacity>
  );
}
