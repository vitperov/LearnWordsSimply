/**
 * Main menu: Start learning, Add a word, Words, Import, Help.
 */

import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { t } from "@/i18n";

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  );
}

export default function MainMenuScreen() {
  const router = useRouter();

  return (
    <View>
      <MenuItem label={t("menu_Start")} onPress={() => router.push("/method")} />
      <MenuItem label={t("menu_Add")} onPress={() => router.push("/add-word")} />
      <MenuItem
        label={t("menu_Words")}
        onPress={() => router.push("/dictionary?next=words")}
      />
      <MenuItem
        label={t("menu_Import")}
        onPress={() => router.push("/dictionary?next=import")}
      />
      <MenuItem label={t("menu_Help")} onPress={() => router.push("/help")} />
    </View>
  );
}
