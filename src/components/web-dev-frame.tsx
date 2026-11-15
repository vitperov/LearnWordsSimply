/**
 * Phone-like column for local web testing. Active only when running under
 * the Metro dev server in a browser (`npm run web`: Platform.OS === "web"
 * and __DEV__). Production web builds and all native builds render children
 * unchanged, so real screen widths are never constrained.
 */

import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { colors, WEB_DEV_WIDTH } from "@/theme";

const isWebDev = Platform.OS === "web" && __DEV__;

export function WebDevFrame({ children }: { children: ReactNode }) {
  if (!isWebDev) return <>{children}</>;
  return (
    <View style={styles.outer}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: "center", backgroundColor: "#1A1A1A" },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: WEB_DEV_WIDTH,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
});
