/**
 * Import screen: pick a document, append its valid words to the chosen
 * dictionary, show "Imported <N> words." — or an alert on failure. User
 * cancel changes nothing and shows no message.
 */

import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { t } from "@/i18n";
import { importFromDocument } from "@/scripts/document-import.ts";
import { useDictionaries } from "./_layout.tsx";

export default function ImportScreen() {
  const { dict } = useLocalSearchParams<{ dict?: string }>();
  const { learn, repeat, fileStore } = useDictionaries();

  const [message, setMessage] = useState<string | null>(null);

  const dictionary = dict === "repeat.dic" ? repeat : learn;

  const pick = () => {
    void importFromDocument(dictionary, fileStore)
      .then((appended) => {
        if (appended !== null) {
          setMessage(`Imported ${appended} words.`);
        }
      })
      .catch((reason: unknown) => {
        const detail = reason instanceof Error ? reason.message : String(reason);
        Alert.alert("Error importing file", detail);
      });
  };

  return (
    <View>
      <Text>{t("title_activity_import_words")}</Text>
      <Pressable onPress={pick}>
        <Text>{t("menu_import_from_file")}</Text>
      </Pressable>
      {message && <Text>{message}</Text>}
    </View>
  );
}
