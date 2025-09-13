/**
 * Show words screen: read-only table of the chosen dictionary in file order —
 * word, translation, W:T counts, W% and T% (the two direction progresses).
 */

import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { getTwProgress, getWtProgress } from "@/core/word-record.ts";
import { t } from "@/i18n";
import { useDictionaries } from "./_layout.tsx";

export default function ShowWordsScreen() {
  const { dict } = useLocalSearchParams<{ dict?: string }>();
  const { learn, repeat } = useDictionaries();

  const dictionary = dict === "repeat.dic" ? repeat : learn;
  const records = dictionary.getAll();

  return (
    // scrollable like the original's activity_show_words.xml — the whole
    // table stays reachable regardless of list length
    <ScrollView>
      <Text>{t("title_activity_show_words")}</Text>
      {records.map((record, index) => (
        <View key={`${record.word}-${index}`}>
          <Text>{record.word}</Text>
          <Text>{record.translation}</Text>
          {/* W:T counts, then the two direction progresses */}
          <Text>{`${record.wCount}:${record.tCount}`}</Text>
          <Text>{`${getWtProgress(record)}%`}</Text>
          <Text>{`${getTwProgress(record)}%`}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
