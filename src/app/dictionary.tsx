/**
 * Choose main/repeat dictionary, then route on to the screen named by the
 * `next` param (words | import) with the chosen dictionary.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "react-native";

import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { colors } from "@/theme";

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
    <Screen>
      <Text style={{ color: colors.text, fontSize: 18, textAlign: "center", margin: 25 }}>
        {t("choose_dictionary")}
      </Text>
      {DICT_CHOICES.map(({ dict, labelKey }) => (
        <AppButton
          key={dict}
          label={t(labelKey)}
          onPress={() => choose(dict)}
          style={{ marginTop: 10, marginHorizontal: 60 }}
        />
      ))}
    </Screen>
  );
}
