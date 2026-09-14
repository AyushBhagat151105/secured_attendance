import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS } from "@/lib/theme";

interface ScanErrorModalProps {
  statusMessage: string;
  onRetry: () => void;
}

export function ScanErrorModal({ statusMessage, onRetry }: ScanErrorModalProps) {
  return (
    <View style={styles.backdrop}>
      <Card variant="alert" style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="close-sharp" size={38} color={PALETTE.firecrackerRed} />
        </View>

        <Text style={styles.heading}>SCAN FAILED</Text>

        <Text style={styles.message}>{statusMessage}</Text>

        <Button
          label="TRY AGAIN"
          variant="primary"
          size="md"
          onPress={onRetry}
          style={{ width: "100%", marginTop: 18 }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 17, 36, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.boneWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: PALETTE.boneWhite,
    textAlign: "center",
    lineHeight: 18,
  },
});
