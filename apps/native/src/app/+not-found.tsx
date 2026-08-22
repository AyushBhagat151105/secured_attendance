import { Link, Stack } from "expo-router";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";

import { Container } from "@/components/container";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View style={styles.container}>
          <View style={styles.surface}>
            <Text style={styles.emoji}>🤔</Text>
            <Text style={styles.title}>Page Not Found</Text>
            <Text style={styles.subtitle}>
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Go Home</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  surface: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 320,
    borderRadius: 8,
    backgroundColor: '#f3f4f6', // secondary
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    color: '#111827', // foreground
    fontWeight: '500',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280', // muted
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4f46e5', // primary
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  }
});
