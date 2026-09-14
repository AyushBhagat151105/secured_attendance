import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="device-binding" />
      <Stack.Screen name="device-mismatch" />
    </Stack>
  );
}
