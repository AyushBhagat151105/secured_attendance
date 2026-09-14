import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function Modal() {
  const { colors } = useAppTheme();

  function handleClose() {
    router.back();
  }

  return (
    <Container scroll={true}>
      <View style={styles.container}>
        <Card variant="bone" style={styles.surface}>
          <View style={styles.iconContainer}>
            <Ionicons name="information-sharp" size={28} color={PALETTE.pureBlack} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>INFORMATION</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Secured Attendance application dialog.
          </Text>
          <Button
            label="CLOSE"
            variant="accent"
            size="md"
            onPress={handleClose}
            style={{ width: "100%", marginTop: 8 }}
          />
        </Card>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  surface: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    width: 52,
    height: 52,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: PALETTE.inkBlack,
    fontWeight: "900",
    fontFamily: FONTS.display,
    fontSize: 18,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(26, 26, 26, 0.75)",
    fontSize: 13,
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: 16,
  },
});
