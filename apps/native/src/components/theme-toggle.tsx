import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useAppTheme } from "@/contexts/app-theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === "dark";

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{
        padding: 8,
        borderRadius: 9999,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      }}
    >
      <Ionicons 
        name={isDark ? "moon" : "sunny"} 
        size={20} 
        color={isDark ? "#ffffff" : "#111827"} 
      />
    </TouchableOpacity>
  );
}
