import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "@/hooks/use-network";

export function NetworkStatusBadge({ compact = false }: { compact?: boolean }) {
  const { isOnline, checkNetwork } = useNetworkStatus();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => checkNetwork()}
      style={[
        styles.badge,
        isOnline ? styles.badgeOnline : styles.badgeOffline,
        compact && styles.badgeCompact,
      ]}
    >
      <Ionicons
        name={isOnline ? "wifi" : "cloud-offline-outline"}
        size={compact ? 13 : 15}
        color={isOnline ? "#059669" : "#dc2626"}
      />
      {!compact && (
        <Text style={[styles.text, isOnline ? styles.textOnline : styles.textOffline]}>
          {isOnline ? "Online" : "Offline"}
        </Text>
      )}
      <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badgeOnline: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  badgeOffline: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.28)",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
  textOnline: {
    color: "#059669",
  },
  textOffline: {
    color: "#dc2626",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: "#10b981",
  },
  dotOffline: {
    backgroundColor: "#ef4444",
  },
});
