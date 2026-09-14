import { Link, Stack } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function NotFoundScreen() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: false }} />
      <Container scroll={true}>
        <View style={styles.container}>
          <Card variant="bone" style={styles.surface}>
            <View style={styles.iconContainer}>
              <Text style={styles.emoji}>🤔</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>PAGE NOT FOUND</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              The screen you are attempting to reach does not exist or has moved.
            </Text>
            <Link href="/" asChild>
              <Button label="RETURN TO HOME" variant="accent" size="md" onPress={() => {}} />
            </Link>
          </Card>
        </View>
      </Container>
    </>
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
    width: 60,
    height: 60,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emoji: {
    fontSize: 28,
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
    marginBottom: 20,
    lineHeight: 18,
  },
});
