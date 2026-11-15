/**
 * Visual theme ported from the original Java app (res/values/styles.xml and
 * res/drawable/button_*.xml): black background, white text, green/red
 * gradient buttons and a gray disabled-looking button.
 */

export const colors = {
  background: "#000000",
  text: "#FFFFFF",
  menuText: "#D0FFD0",
  grayText: "#808080",
  panel: "#303030",
  tableHeader: "#606060",
  hint: "#808080",
  error: "#FF6060",
} as const;

export type ButtonKind = "green" | "red" | "gray";

/** Per-kind button look: gradient (or solid) fill, border and text colour. */
export const buttonLooks: Record<
  ButtonKind,
  { backgroundColor: string; backgroundImage?: string; borderColor: string; color: string }
> = {
  green: {
    backgroundColor: "#006000",
    backgroundImage: "linear-gradient(to bottom, #003000, #006000, #003000)",
    borderColor: "#007000",
    color: colors.text,
  },
  red: {
    backgroundColor: "#600000",
    backgroundImage: "linear-gradient(to bottom, #300000, #600000, #300000)",
    borderColor: "#700000",
    color: colors.text,
  },
  gray: {
    backgroundColor: "#404040",
    borderColor: "#808080",
    color: colors.grayText,
  },
};

/** Width of the phone-like column used only by the local web dev server. */
export const WEB_DEV_WIDTH = 600;
