/**
 * i18n entry point: the two string tables, the lookup `t()`, and the locale
 * hook. The device locale decides the table (ru → Russian), everything else
 * falls back to English.
 */

import { getLocales, useLocales } from "expo-localization";

import { en, type StringKey } from "./en.ts";
import { ru } from "./ru.ts";

const tables = { en, ru };

type Table = keyof typeof tables;

/** The device's preferred language → table name; only Russian maps to RU. */
function tableFor(languageCode: string | null | undefined): Table {
  return languageCode === "ru" ? "ru" : "en";
}

// Resolved once at startup for `t()`: on Android the device locale is fixed
// for the app's lifetime (a locale change restarts the app).
const active: Table = tableFor(getLocales()[0].languageCode);

/**
 * Looks up a string in the active table (device locale, EN fallback).
 * Placeholder patterns (%1$d, %2$s, %s) are kept verbatim from the original
 * tables; callers format them.
 */
export function t(key: StringKey): string {
  return tables[active][key];
}

/**
 * React hook resolving the device locale to the active table ("en" | "ru").
 * Re-renders consumers when the locale changes.
 */
export function useLocale(): Table {
  return tableFor(useLocales()[0].languageCode);
}
