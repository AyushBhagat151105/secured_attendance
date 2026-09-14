import React from "react";
import {
  View,
  TouchableOpacity,
  ViewProps,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useResponsive } from "@/hooks/use-responsive";
import { PALETTE, RADIUS, BORDERS } from "@/lib/theme";

export type CardVariant = "bone" | "lilac" | "yellow" | "alert" | "matcha";

interface CardProps extends ViewProps {
  variant?: CardVariant;
  bordered?: boolean;
  padded?: boolean;
  onPress?: TouchableOpacityProps["onPress"];
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = "bone",
  bordered = true,
  padded = true,
  onPress,
  style,
  ...props
}: CardProps) {
  const { isDark } = useAppTheme();
  const { isSmallDevice } = useResponsive();

  let backgroundColor: string;
  let borderColor: string;

  switch (variant) {
    case "lilac":
      backgroundColor = isDark ? PALETTE.darkNested : PALETTE.lilacShadow;
      borderColor = isDark ? PALETTE.darkBorder : PALETTE.boneWhite;
      break;
    case "yellow":
      backgroundColor = PALETTE.hiVisYellow;
      borderColor = PALETTE.pureBlack;
      break;
    case "alert":
      backgroundColor = PALETTE.firecrackerRed;
      borderColor = PALETTE.boneWhite;
      break;
    case "matcha":
      backgroundColor = PALETTE.matchaCream;
      borderColor = PALETTE.inkBlack;
      break;
    case "bone":
    default:
      backgroundColor = isDark ? PALETTE.darkCard : PALETTE.boneWhite;
      borderColor = isDark ? PALETTE.darkBorder : PALETTE.inkBlack;
      break;
  }

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderRadius: RADIUS.lg,
    borderWidth: bordered ? BORDERS.default : 0,
    borderColor,
    padding: padded ? (isSmallDevice ? 12 : 16) : 0,
    shadowColor: PALETTE.pureBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[cardStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]} {...props}>
      {children}
    </View>
  );
}
