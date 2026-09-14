import { useState, useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { authClient } from "@/lib/auth-client";
import { clearAllCachedAuth, getCachedProfile } from "@/lib/session-cache";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function DeviceMismatchScreen() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [boundModel, setBoundModel] = useState<string>("another phone");
  const { colors } = useAppTheme();

  useEffect(() => {
    getCachedProfile().then((p) => {
      if (p?.deviceModel) {
        setBoundModel(p.deviceModel);
      }
    });
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await clearAllCachedAuth();
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
      router.replace("/(auth)/sign-in");
    }
  }

  return (
    <Container scroll={true}>
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="phone-portrait-sharp" size={38} color={PALETTE.boneWhite} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            DEVICE NOT AUTHORIZED
          </Text>
          <Text style={styles.subtitle}>
            Your student account is cryptographically bound to {boundModel}.
          </Text>
        </View>

        <Card variant="bone" style={styles.card}>
          <View style={styles.warningBox}>
            <Ionicons name="warning-sharp" size={20} color={PALETTE.boneWhite} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>PROXY PREVENTION ACTIVE</Text>
              <Text style={styles.warningText}>
                To ensure attendance authenticity, students can only log in from their own registered smartphone.
              </Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-sharp" size={16} color={colors.textPrimary} />
              <Text style={[styles.infoItemText, { color: colors.textSecondary }]}>
                Log in using your registered phone to scan classroom QR codes.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle-sharp" size={16} color={colors.textPrimary} />
              <Text style={[styles.infoItemText, { color: colors.textSecondary }]}>
                If you lost or changed your device, request a rebind from your department administrator.
              </Text>
            </View>
          </View>

          <Button
            label={isSigningOut ? "SIGNING OUT..." : "SIGN OUT OF THIS DEVICE"}
            variant="destructive"
            size="lg"
            loading={isSigningOut}
            onPress={handleSignOut}
            icon={<Ionicons name="log-out-sharp" size={18} color={PALETTE.boneWhite} />}
            style={{ width: "100%", marginTop: 18 }}
          />
        </Card>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.firecrackerRed,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.boneWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "rgba(249, 245, 242, 0.8)",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  card: {
    padding: 20,
  },
  warningBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: PALETTE.firecrackerRed,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 16,
  },
  infoList: {
    gap: 12,
    marginVertical: 6,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoItemText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "rgba(26, 26, 26, 0.8)",
    flex: 1,
    lineHeight: 17,
  },
});
