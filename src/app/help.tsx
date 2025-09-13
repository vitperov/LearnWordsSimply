/**
 * Help screen: the bundled help HTML (help-en.html / help-ru.html by device
 * locale) in a WebView. No network — purely bundled assets.
 */

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { WebView } from "react-native-webview";

import { t, useLocale } from "@/i18n";

const HELP_ASSETS = {
  "help-en.html": require("../../assets/help/help-en.html"),
  "help-ru.html": require("../../assets/help/help-ru.html"),
} as const;

export default function HelpScreen() {
  const locale = useLocale();
  const assetName = locale === "ru" ? "help-ru.html" : "help-en.html";
  const assetModule = HELP_ASSETS[assetName];

  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHelp() {
      try {
        const asset = Asset.fromModule(assetModule);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        const localUri = asset.localUri ?? asset.uri;
        const text = await new File(localUri).text();
        if (!cancelled) {
          setHtml(text);
        }
      } catch {
        // the help content failing to load is fatal to this screen only —
        // the title stays, no fallback content is shown
      }
    }
    void loadHelp();
    return () => {
      cancelled = true;
    };
  }, [assetModule]);

  return (
    <View style={{ flex: 1 }}>
      <Text>{t("title_activity_help")}</Text>
      {html !== null && <WebView source={{ html }} style={{ flex: 1 }} />}
    </View>
  );
}
