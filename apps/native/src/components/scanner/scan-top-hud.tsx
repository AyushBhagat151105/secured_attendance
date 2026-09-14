import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NetworkStatusBadge } from "@/components/network-status-badge";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

interface ScanTopHudProps {
  topInset: number;
  torch: boolean;
  onBack: () => void;
  onToggleTorch: () => void;
}

export function ScanTopHud({ topInset, torch, onBack, onToggleTorch }: ScanTopHudProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.topHud, { paddingTop: Math.max(topInset, 16) }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBack}
        style={[
          styles.backButton,
          {
            backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
            borderColor: isDark ? colors.border : PALETTE.inkBlack,
          },
        ]}
      >
        <Ionicons
          name="arrow-back-sharp"
          size={20}
          color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
        />
      </TouchableOpacity>

      <View style={styles.topHudTags}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleTorch}
          style={[
            styles.torchButton,
            torch && { backgroundColor: PALETTE.hiVisYellow },
            { borderColor: isDark ? colors.border : PALETTE.inkBlack },
          ]}
        >
          <Ionicons
            name={torch ? "flashlight-sharp" : "flashlight-outline"}
            size={15}
            color={torch ? PALETTE.pureBlack : isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
          />
        </TouchableOpacity>
        <NetworkStatusBadge compact />
        <View style={styles.gpsPill}>
          <Ionicons name="location-sharp" size={12} color={PALETTE.pureBlack} />
          <Text style={styles.gpsPillText}>GPS ACTIVE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  topHudTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  torchButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: BORDERS.hairline,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.pureBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
  },
});
