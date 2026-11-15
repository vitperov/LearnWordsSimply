/**
 * Main menu: Start learning, Add a word, Words, Import, Help.
 */

import { useRouter } from "expo-router";
import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { t } from "@/i18n";

/** Menu buttons share the free height equally (original: layout_weight 1). */
function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return <AppButton label={label} onPress={onPress} size="menu" style={{ flex: 1, margin: 10 }} />;
}

export default function MainMenuScreen() {
  const router = useRouter();

  return (
    <Screen style={{ padding: 30 }}>
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
    </Screen>
  );
}
