/**
 * Choose the learning method: 80/20 | new only | repeat only, then on to the
 * trainer with the strategy param.
 */

import { useRouter } from "expo-router";
import { Text } from "react-native";

import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { colors } from "@/theme";

import type { Strategy } from "@/core/learning-session.ts";
import { t } from "@/i18n";

const METHODS: { strategy: Strategy; labelKey: "menu_learn_8020" | "menu_learn_new_only" | "menu_learn_repeat_only" }[] = [
  { strategy: "8020", labelKey: "menu_learn_8020" },
  { strategy: "new-only", labelKey: "menu_learn_new_only" },
  { strategy: "repeat-only", labelKey: "menu_learn_repeat_only" },
];

export default function MethodScreen() {
  const router = useRouter();

  const choose = (strategy: Strategy) => {
    router.push(`/learn?strategy=${strategy}`);
  };

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 18, textAlign: "center", margin: 25 }}>
        {t("menu_Start")}
      </Text>
      {METHODS.map(({ strategy, labelKey }) => (
        <AppButton
          key={strategy}
          label={t(labelKey)}
          onPress={() => choose(strategy)}
          style={{ marginTop: 10, marginHorizontal: 60 }}
        />
      ))}
    </Screen>
  );
}
