/**
 * Root layout: the stack navigator plus the dictionaries provider, which
 * loads both dictionaries once at startup behind a loading screen and
 * exposes them (with the file store) via a plain React context.
 */

import { Stack } from "expo-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert, Text, View } from "react-native";

import { Dictionary } from "@/core/dictionary.ts";
import type { FileStore } from "@/core/file-store.ts";
import { t } from "@/i18n";
import { ExpoFileStore } from "@/storage/expo-file-store.ts";

interface DictionariesContextValue {
  learn: Dictionary;
  repeat: Dictionary;
  fileStore: FileStore;
  ready: boolean;
}

const DictionariesContext = createContext<DictionariesContextValue | null>(null);

/**
 * Loads one dictionary; a load failure (a present-but-unreadable file) is
 * surfaced as an alert and the dictionary continues empty.
 */
async function loadWithAlert(dict: Dictionary, fileStore: FileStore): Promise<void> {
  try {
    await dict.load(fileStore);
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : String(reason);
    Alert.alert(t("error_title"), `${t("error_load_dict")}\n${detail}`);
  }
}

/** Access to the two loaded dictionaries and the file store. */
export function useDictionaries(): DictionariesContextValue {
  const value = useContext(DictionariesContext);
  if (!value) {
    throw new Error("useDictionaries must be used within DictionariesProvider");
  }
  return value;
}

export function DictionariesProvider({ children }: { children: ReactNode }) {
  const [learn, setLearn] = useState<Dictionary | null>(null);
  const [repeat, setRepeat] = useState<Dictionary | null>(null);
  const [fileStore] = useState<FileStore>(() => new ExpoFileStore());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBoth() {
      const learnDict = new Dictionary("user.dic");
      const repeatDict = new Dictionary("repeat.dic");
      // a present-but-unreadable file is surfaced as an alert, then the app
      // continues with an empty dictionary (the load contract)
      await loadWithAlert(learnDict, fileStore);
      await loadWithAlert(repeatDict, fileStore);
      if (!cancelled) {
        setLearn(learnDict);
        setRepeat(repeatDict);
        setReady(true);
      }
    }
    void loadBoth();
    return () => {
      cancelled = true;
    };
  }, [fileStore]);

  if (!ready || !learn || !repeat) {
    // loading screen while both dictionaries load
    return (
      <View>
        <Text>{t("app_name")}</Text>
      </View>
    );
  }

  return (
    <DictionariesContext.Provider value={{ learn, repeat, fileStore, ready }}>
      {children}
    </DictionariesContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <DictionariesProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: t("app_name") }} />
        <Stack.Screen name="method" options={{ title: t("menu_Start") }} />
        <Stack.Screen name="dictionary" options={{ title: t("title_activity_choose_dictionary") }} />
        <Stack.Screen name="learn" options={{ title: t("title_activity_learn_words") }} />
        <Stack.Screen name="add-word" options={{ title: t("title_activity_add_word") }} />
        <Stack.Screen name="words" options={{ title: t("title_activity_show_words") }} />
        <Stack.Screen name="import" options={{ title: t("title_activity_import_words") }} />
        <Stack.Screen name="help" options={{ title: t("title_activity_help") }} />
      </Stack>
    </DictionariesProvider>
  );
}
