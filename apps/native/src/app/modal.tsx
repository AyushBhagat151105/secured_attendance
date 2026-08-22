import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";

import { Container } from "@/components/container";

function Modal() {
  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.surface}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark" size={24} color="#111827" />
            </View>
            <Text style={styles.title}>Modal Screen</Text>
            <Text style={styles.subtitle}>
              This is an example modal screen for dialogs and confirmations.
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Container>
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
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderRadius: 8,
    backgroundColor: '#f3f4f6', // secondary
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#e5e7eb', // accent 
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 12,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  }
});

export default Modal;
