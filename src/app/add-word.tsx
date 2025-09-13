/**
 * Add word screen: two text fields (word, translation); a valid pair is
 * appended to the main dictionary with cleared stats and the file saved;
 * both fields clear on success. Invalid input is rejected with an inline
 * message and no dictionary mutation.
 */

import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { clearStats, makeWordRecord } from "@/core/word-record.ts";
import { t } from "@/i18n";

import { useDictionaries } from "./_layout.tsx";

/**
 * Surfaces a failed dictionary save: the in-memory state is intact (the
 * appended word stays) and the save is retried on the next mutation, so
 * this only reports the failure.
 */
function surfaceSaveError(reason: unknown) {
  Alert.alert(t("error_title"), reason instanceof Error ? reason.message : String(reason));
}

export default function AddWordScreen() {
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { learn, fileStore } = useDictionaries();

  const add = () => {
    // trim surrounding whitespace at the UI level
    const record = makeWordRecord(word.trim(), translation.trim());
    if (!record) {
      // invalid input: inline message, no mutation
      setError(t("invalid_word"));
      return;
    }
    // freshly added words are cleared by the caller (original's clearStat)
    clearStats(record);
    learn.addWord(record);
    // the add is committed in memory: clear both fields (and any stale
    // error); a failed save is surfaced, state intact, retried next time
    setWord("");
    setTranslation("");
    setError(null);
    learn.save(fileStore).catch(surfaceSaveError);
  };

  return (
    <View>
      <Text>{t("add_dictionary")}</Text>
      <TextInput
        value={word}
        onChangeText={setWord}
        placeholder={t("foreign_word")}
      />
      <TextInput
        value={translation}
        onChangeText={setTranslation}
        placeholder={t("translation")}
      />
      {error && <Text>{error}</Text>}
      <Pressable onPress={add}>
        <Text>{t("menu_Add")}</Text>
      </Pressable>
    </View>
  );
}
