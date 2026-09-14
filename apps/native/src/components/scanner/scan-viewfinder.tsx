import { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

interface ScanViewfinderProps {
  scanBoxSize: number;
  scanStatus: "idle" | "processing" | "success" | "error";
  zoom: number;
  onSetZoom: (level: number) => void;
}

export function ScanViewfinder({
  scanBoxSize,
  scanStatus,
  zoom,
  onSetZoom,
}: ScanViewfinderProps) {
  const { colors, isDark } = useAppTheme();

  const linePosition = useSharedValue(0);
  const lineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: linePosition.value }],
    };
  });

  useEffect(() => {
    if (scanStatus === "idle") {
      linePosition.value = withRepeat(
        withSequence(
          withTiming(scanBoxSize - 10, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [scanStatus, scanBoxSize]);

  return (
    <View style={styles.viewfinderWrapper} pointerEvents="box-none">
      <View style={[styles.scanBox, { width: scanBoxSize, height: scanBoxSize }]} pointerEvents="none">
        <View style={[styles.cornerBracket, styles.topLeft]} />
        <View style={[styles.cornerBracket, styles.topRight]} />
        <View style={[styles.cornerBracket, styles.bottomLeft]} />
        <View style={[styles.cornerBracket, styles.bottomRight]} />

        {scanStatus === "idle" && <Animated.View style={[styles.laserLine, lineStyle]} />}

        {scanStatus === "processing" && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={PALETTE.hiVisYellow} />
            <Text style={styles.processingText}>VERIFYING ATTENDANCE...</Text>
          </View>
        )}
      </View>

      {scanStatus === "idle" && (
        <View style={styles.zoomControlRow} pointerEvents="auto">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSetZoom(0)}
            style={[
              styles.zoomPill,
              zoom === 0 && styles.zoomPillActive,
              { borderColor: isDark ? colors.border : PALETTE.inkBlack },
            ]}
          >
            <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSetZoom(0.25)}
            style={[
              styles.zoomPill,
              Math.abs(zoom - 0.25) < 0.05 && styles.zoomPillActive,
              { borderColor: isDark ? colors.border : PALETTE.inkBlack },
            ]}
          >
            <Text style={[styles.zoomText, Math.abs(zoom - 0.25) < 0.05 && styles.zoomTextActive]}>
              2x
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSetZoom(0.5)}
            style={[
              styles.zoomPill,
              zoom >= 0.4 && styles.zoomPillActive,
              { borderColor: isDark ? colors.border : PALETTE.inkBlack },
            ]}
          >
            <Text style={[styles.zoomText, zoom >= 0.4 && styles.zoomTextActive]}>3x</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.instructionPill,
          {
            backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
            borderColor: isDark ? colors.border : PALETTE.inkBlack,
          },
        ]}
        pointerEvents="none"
      >
        <Ionicons
          name="scan-sharp"
          size={14}
          color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
        />
        <Text
          style={[
            styles.instructionText,
            { color: isDark ? PALETTE.boneWhite : PALETTE.pureBlack },
          ]}
        >
          {zoom > 0
            ? `ZOOM ${zoom >= 0.4 ? "3x" : "2x"} ACTIVE • ALIGN QR INSIDE FRAME`
            : "ALIGN CLASSROOM QR CODE INSIDE FRAME"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewfinderWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  cornerBracket: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: PALETTE.hiVisYellow,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.md,
  },
  laserLine: {
    height: 3,
    backgroundColor: PALETTE.hiVisYellow,
    shadowColor: PALETTE.hiVisYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  processingText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
    letterSpacing: 0.5,
  },
  zoomControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 18,
  },
  zoomPill: {
    width: 44,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: BORDERS.hairline,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomPillActive: {
    backgroundColor: PALETTE.hiVisYellow,
    borderColor: PALETTE.pureBlack,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
  },
  zoomTextActive: {
    color: PALETTE.pureBlack,
  },
  instructionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  instructionText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
    letterSpacing: 0.4,
  },
});
