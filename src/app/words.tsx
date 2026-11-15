/**
 * Show words screen: read-only table of the chosen dictionary in file order —
 * word, translation, W:T counts, W% and T% (the two direction progresses).
 */

import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { colors } from "@/theme";

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
    <Screen scroll>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.wide, styles.header]}>{t("word")}</Text>
        <Text style={[styles.cell, styles.wide, styles.header]}>{t("translation")}</Text>
        <Text style={[styles.cell, styles.header]}>{t("shown")}</Text>
        <Text style={[styles.cell, styles.header]}>{t("progress_wt")}</Text>
        <Text style={[styles.cell, styles.header]}>{t("progress_tw")}</Text>
      </View>
      {records.map((record, index) => (
        <View key={`${record.word}-${index}`} style={styles.row}>
          <Text style={[styles.cell, styles.wide]}>{record.word}</Text>
          <Text style={[styles.cell, styles.wide]}>{record.translation}</Text>
          {/* W:T counts, then the two direction progresses */}
          <Text style={styles.cell}>{`${record.wCount}:${record.tCount}`}</Text>
          <Text style={styles.cell}>{`${getWtProgress(record)}%`}</Text>
          <Text style={styles.cell}>{`${getTwProgress(record)}%`}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", backgroundColor: colors.text },
  cell: { flex: 1, color: colors.text, margin: 1, padding: 2, backgroundColor: colors.background },
  wide: { flex: 2 },
  header: { backgroundColor: colors.tableHeader },
});
