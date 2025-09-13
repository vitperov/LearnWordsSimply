/**
 * Choose the learning method: 80/20 | new only | repeat only, then on to the
 * trainer with the strategy param.
 */

import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

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
    <View>
      <Text>{t("menu_Start")}</Text>
      {METHODS.map(({ strategy, labelKey }) => (
        <Pressable key={strategy} onPress={() => choose(strategy)}>
          <Text>{t(labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
