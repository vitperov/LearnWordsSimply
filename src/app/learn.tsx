/**
 * Trainer screen: shows the current word, reveals the answer, records
 * Right/Mistake, and surfaces the post-answer offer dialogs (move to
 * repeat / delete / move to main) plus the manual options menu (move,
 * delete). "No words" state hides the options.
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { Screen } from "@/components/screen";
import { colors } from "@/theme";

import { useDictionaries } from "./_layout.tsx";
import type { Strategy } from "@/core/learning-session.ts";
import { LearningSession } from "@/core/learning-session.ts";
import { getAnswer, getProgress, getWord, type WordRecord } from "@/core/word-record.ts";
import { t, useLocale } from "@/i18n";

type Draw = { record: WordRecord; direction: boolean; dict: "learn" | "repeat" };

/**
 * Applies the drawn direction to the record. The session resolves the
 * direction at draw time (a mastered side is skipped) and returns it
 * alongside the record without applying it; every reader — the word/answer
 * display, the progress header, and the answer recording — reads the
 * record's own direction, so it must be set here, as the original set the
 * direction on the record at draw time. The direction is presentation
 * state and is never persisted.
 */
function applyDirection(draw: Draw | null): Draw | null {
  if (draw) draw.record.dirW2T = draw.direction;
  return draw;
}

/**
 * Surfaces a failed dictionary save: the in-memory state is intact and the
 * save is retried on the next mutation, so this only reports the failure.
 */
function surfaceSaveError(reason: unknown) {
  Alert.alert(t("error_title"), reason instanceof Error ? reason.message : String(reason));
}

const STRATEGIES: Strategy[] = ["new-only", "repeat-only", "8020"];

function asStrategy(value: string | undefined): Strategy {
  return STRATEGIES.includes(value as Strategy) ? (value as Strategy) : "8020";
}

/**
 * Confirm/decline buttons for the offer dialogs. The original used the
 * platform's ok/cancel strings (android.R.string.ok/cancel), which the
 * string tables don't carry — minimal literals localized by device locale.
 * A missing decline makes Cancel a plain dismiss, as the original's manual
 * move/delete dialogs behave.
 */
function offerButtons(
  ok: string,
  cancel: string,
  onConfirm: () => void,
  onDecline?: () => void,
) {
  return [
    { text: ok, onPress: onConfirm },
    onDecline
      ? // style "cancel": RN fires the cancel-styled button on Android
        // back-press dismissal too, so declining works from either path
        { text: cancel, onPress: onDecline, style: "cancel" as const }
      : { text: cancel },
  ];
}

export default function LearnScreen() {
  const { strategy: strategyParam } = useLocalSearchParams<{ strategy?: string }>();
  const { learn, repeat, fileStore } = useDictionaries();
  const locale = useLocale();
  const ok = locale === "ru" ? "ОК" : "OK";
  const cancel = locale === "ru" ? "Отмена" : "Cancel";

  const [session] = useState(
    () => new LearningSession(learn, repeat, asStrategy(strategyParam), fileStore),
  );
  // first draw as lazy initial state — a remount restarts the session with
  // the strategy re-selected from the route params
  const [draw, setDraw] = useState<Draw | null>(() => applyDirection(session.nextWord()));
  const [revealed, setRevealed] = useState(false);
  // blocks a second answer while recordAnswer's save is in flight
  const answering = useRef(false);

  const drawNext = useCallback(() => {
    setRevealed(false);
    setDraw(applyDirection(session.nextWord()));
  }, [session]);

  const proceedAfterMove = () => {
    session
      .moveCurrent()
      .then((moved) => {
        if (moved) drawNext();
      })
      .catch((reason: unknown) => {
        // the in-memory move stands — proceed; the failed save is retried
        // by the next mutation
        drawNext();
        surfaceSaveError(reason);
      });
  };

  const proceedAfterDelete = () => {
    session
      .deleteCurrent()
      .then((deleted) => {
        if (deleted) drawNext();
      })
      .catch((reason: unknown) => {
        drawNext();
        surfaceSaveError(reason);
      });
  };

  // the post-record disposition, shared by the success path and the
  // surfaced-failure path: reset the guard, evaluate the offer, and either
  // open its dialog or draw the next word — the in-memory state it reads is
  // intact either way, so the recorded answer can never be re-recorded
  const finishAnswer = () => {
    answering.current = false;
    const action = session.postAnswerAction();
    if (action === "offer-move-to-repeat") {
      Alert.alert(
        t("title_move_known_word"),
        t("message_move_known_word"),
        offerButtons(ok, cancel, proceedAfterMove, drawNext),
      );
    } else if (action === "offer-delete") {
      Alert.alert(
        t("title_delete_known_word"),
        t("message_delete_known_word"),
        offerButtons(ok, cancel, proceedAfterDelete, drawNext),
      );
    } else if (action === "offer-move-to-learn") {
      Alert.alert(
        t("title_move_unknown_word"),
        t("message_move_unknown_word"),
        offerButtons(ok, cancel, proceedAfterMove, drawNext),
      );
    } else {
      drawNext();
    }
  };

  const answer = (right: boolean) => {
    if (answering.current) return;
    answering.current = true;
    session
      .recordAnswer(right)
      .then(finishAnswer)
      .catch((reason: unknown) => {
        surfaceSaveError(reason);
        finishAnswer();
      });
  };

  const confirmMove = () => {
    // manual menu: Cancel only dismisses — the word stays on screen;
    // a manual op while an answer's save is still in flight would
    // interleave with it, so it is refused during that window
    if (answering.current) return;
    Alert.alert(
      t("title_move_word"),
      t("message_move_word"),
      offerButtons(ok, cancel, proceedAfterMove),
    );
  };

  const confirmDelete = () => {
    // refused while an answer's save is still in flight (see confirmMove)
    if (answering.current) return;
    Alert.alert(
      t("title_delete_word"),
      t("message_delete_word"),
      offerButtons(ok, cancel, proceedAfterDelete),
    );
  };

  if (!draw) {
    // "No words" state — options hidden
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.large}>{t("no_words")}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* the word being asked */}
      <View style={[styles.center, { flex: 5 }]}>
        <Text style={styles.small}>
          {draw.direction ? t("progress_wt").split("\n")[0] : t("progress_tw").split("\n")[0]}
        </Text>
        <Text style={styles.large}>{getWord(draw.record)}</Text>
      </View>

      {/* the answer box: tap to reveal */}
      <Pressable
        onPress={() => setRevealed(true)}
        style={[styles.center, styles.answer]}
      >
        <Text style={styles.large}>{revealed ? getAnswer(draw.record) : "?"}</Text>
      </Pressable>

      {/* Right / Mistake (only once the answer is shown) */}
      <View style={styles.answers}>
        {revealed && (
          <>
            <AppButton
              label={t("right")}
              kind="green"
              onPress={() => answer(true)}
              style={styles.answerButton}
            />
            <AppButton
              label={t("mistake")}
              kind="red"
              onPress={() => answer(false)}
              style={styles.answerButton}
            />
          </>
        )}
      </View>

      {/* header info + options menu: manual move/delete over the same primitives */}
      <View style={styles.info}>
        <Text style={styles.medium}>
          {t("word_progress")
            .replace("%1$d", String(getProgress(draw.record)))
            .replace("%2$s", draw.direction ? draw.record.wtHistory : draw.record.twHistory)
            .replace("%%", "%")}
        </Text>
        <Text style={styles.medium}>
          {t("current_dict").replace("%s", draw.dict === "learn" ? t("status_dict_new") : t("status_dict_repeat"))}
        </Text>
        <Text style={styles.medium}>
          {t("words_in_dict").replace("%1$d", String(session.activeDictSize()))}
        </Text>
        <View style={styles.options}>
          <AppButton label={t("title_move_word")} kind="gray" onPress={confirmMove} style={styles.optionButton} />
          <AppButton label={t("title_delete_word")} kind="gray" onPress={confirmDelete} style={styles.optionButton} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  large: { color: colors.text, fontSize: 24, textAlign: "center" },
  medium: { color: colors.text, fontSize: 16, textAlign: "center" },
  small: { color: colors.grayText, fontSize: 14, marginBottom: 6 },
  answer: { flex: 4, margin: 25, backgroundColor: colors.panel },
  answers: { flex: 5, flexDirection: "row" },
  answerButton: { flex: 1, margin: 15 },
  info: { flex: 8, margin: 20 },
  options: { flexDirection: "row", marginTop: 12 },
  optionButton: { flex: 1, marginHorizontal: 5 },
});
