import { useWindowDimensions, PixelRatio, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Baseline mobile reference: 375 x 812 (iPhone standard)
  const isSmallWidth = width < 375;
  const isSmallHeight = height < 700;
  const isSmallDevice = isSmallWidth || isSmallHeight;
  const isTablet = width >= 600;

  // Scale factor based on width, clamped to prevent extreme scaling
  const scaleFactor = Math.min(Math.max(width / 375, 0.85), 1.25);

  const scale = (size: number): number => {
    const newSize = size * scaleFactor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  // Safe vertical spacing factoring in soft navigation buttons (especially Android 3-button nav)
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 0);
  const topInset = Math.max(insets.top, Platform.OS === "android" ? 24 : 0);

  return {
    width,
    height,
    fontScale,
    isSmallDevice,
    isSmallWidth,
    isSmallHeight,
    isTablet,
    scale,
    insets,
    bottomInset,
    topInset,
  };
}
