import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

interface CameraPermissionCardProps {
  onRequestPermission: () => void;
}

export function CameraPermissionCard({ onRequestPermission }: CameraPermissionCardProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.stage }]}>
      <Card variant="bone" style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="camera-sharp" size={36} color={PALETTE.pureBlack} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          CAMERA PERMISSION REQUIRED
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          To mark attendance securely, we need access to your camera to scan classroom QR codes.
        </Text>
        <Button
          label="GRANT ACCESS"
          variant="accent"
          size="lg"
          onPress={onRequestPermission}
          icon={<Ionicons name="shield-checkmark-sharp" size={18} color={PALETTE.pureBlack} />}
          style={{ width: "100%", marginTop: 8 }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: FONTS.display,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
});
