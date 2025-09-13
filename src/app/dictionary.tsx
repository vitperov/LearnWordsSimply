/**
 * Choose main/repeat dictionary, then route on to the screen named by the
 * `next` param (words | import) with the chosen dictionary.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { t } from "@/i18n";

/** The screens the chooser routes on to, by `next` param. */
const NEXT_PATHNAMES = {
  words: "/words",
  import: "/import",
} as const;

const DICT_CHOICES = [
  { dict: "user.dic", labelKey: "menu_dict_new" },
  { dict: "repeat.dic", labelKey: "menu_dict_repeat" },
] as const;

type DictName = (typeof DICT_CHOICES)[number]["dict"];

export default function DictionaryScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const nextPathname =
    next === "words" || next === "import" ? NEXT_PATHNAMES[next] : null;

  const choose = (dict: DictName) => {
    if (nextPathname !== null) {
      router.push(`${nextPathname}?dict=${dict}`);
    }
  };

  return (
    <View>
      <Text>{t("choose_dictionary")}</Text>
      {DICT_CHOICES.map(({ dict, labelKey }) => (
        <Pressable key={dict} onPress={() => choose(dict)}>
          <Text>{t(labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
