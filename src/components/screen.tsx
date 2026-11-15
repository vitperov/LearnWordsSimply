/** Black full-screen container shared by every screen. */

import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "@/theme";

export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (scroll) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={style}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
