/**
 * The app's rounded gradient button (original: button_green / button_red /
 * button_gray drawables with the ImportButtons / MainMenu styles).
 */

import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { buttonLooks, colors, type ButtonKind } from "@/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  /** "menu": large text, centred (main menu); "normal": regular text. */
  size?: "menu" | "normal";
  style?: StyleProp<ViewStyle>;
}

export function AppButton({ label, onPress, kind = "green", size = "normal", style }: AppButtonProps) {
  const look = buttonLooks[kind];
  const { color, ...box } = look;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        box,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: size === "menu" ? (kind === "green" ? colors.menuText : color) : color },
          size === "menu" && styles.menuText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 5,
    borderWidth: 2,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  text: { fontSize: 16, textAlign: "center" },
  menuText: { fontSize: 22 },
});
