import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {}

export function PasswordInput(props: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        secureTextEntry={!showPassword}
        style={[props.style, styles.input]}
      />
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => setShowPassword(!showPassword)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    paddingRight: 40, // Make room for the icon
  },
  iconContainer: {
    position: "absolute",
    right: 12,
  },
});
