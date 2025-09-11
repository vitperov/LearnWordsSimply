/**
 * Learning session: the trainer state machine over the two dictionaries.
 *
 * Plain erasable TypeScript — no react/expo imports here.
 */

import type { Dictionary } from "./dictionary.ts";
import type { FileStore } from "./file-store.ts";
import {
  clearStats,
  isLearned,
  recordAnswer,
  type WordRecord,
} from "./word-record.ts";

/** How the session picks dictionaries: new-only | repeat-only | 80/20. */
export type Strategy = "new-only" | "repeat-only" | "8020";

/**
 * Owns the learn and repeat dictionaries, one active strategy, and the
 * current presentation. Answers are recorded and saved immediately; the
 * post-answer disposition decides whether an offer dialog (move/delete) is
 * due before the next draw.
 */
export class LearningSession {
  readonly learnDict: Dictionary;
  readonly repeatDict: Dictionary;
  readonly strategy: Strategy;
  private fileStore: FileStore;
  private rng: () => number;
  private current: { record: WordRecord; direction: boolean; dict: "learn" | "repeat" } | null =
    null;
  private lastAnswerRight = false;

  constructor(
    learnDict: Dictionary,
    repeatDict: Dictionary,
    strategy: Strategy,
    fileStore: FileStore,
    rng: () => number = Math.random,
  ) {
    this.learnDict = learnDict;
    this.repeatDict = repeatDict;
    this.strategy = strategy;
    this.fileStore = fileStore;
    this.rng = rng;
  }

  /**
   * Draws the next word. The active dictionary: new-only → learn;
   * repeat-only → repeat; 8020 → repeat with probability 0.2 (rng < 0.2)
   * provided repeat is non-empty, else learn. Then pickRandom on the active
   * dictionary, published as the current word. Null when there are no words
   * (the screen shows "No words").
   */
  nextWord(): { record: WordRecord; direction: boolean; dict: "learn" | "repeat" } | null {
    const active = this.selectActiveDict();
    const draw = active.pickRandom(this.rng);
    if (draw === null) {
      this.current = null;
      return null;
    }
    this.current = {
      record: draw.record,
      direction: draw.direction,
      dict: active === this.learnDict ? "learn" : "repeat",
    };
    return this.current;
  }

  /** The strategy's dictionary for this draw; 8020 spends one rng value. */
  private selectActiveDict(): Dictionary {
    if (this.strategy === "new-only") return this.learnDict;
    if (this.strategy === "repeat-only") return this.repeatDict;
    return this.rng() < 0.2 && this.repeatDict.count() > 0 ? this.repeatDict : this.learnDict;
  }

  /**
   * Records the answer for the current word and saves the active dictionary
   * immediately — before any offer is evaluated. Resolves once the save is
   * done.
   */
  async recordAnswer(right: boolean): Promise<void> {
    if (this.current === null) return;
    recordAnswer(this.current.record, right);
    this.lastAnswerRight = right;
    await this.activeDict().save(this.fileStore);
  }

  /** The dictionary the current word was drawn from. */
  private activeDict(): Dictionary {
    return this.current?.dict === "repeat" ? this.repeatDict : this.learnDict;
  }

  /**
   * The post-answer disposition, the first match in this order:
   * 1. offer-move-to-repeat — learned AND current dict is learn;
   * 2. offer-delete — right AND learned AND current dict is repeat;
   * 3. offer-move-to-learn — NOT right AND current dict is repeat;
   * 4. next — otherwise.
   */
  postAnswerAction(): "offer-move-to-repeat" | "offer-delete" | "offer-move-to-learn" | "next" {
    if (this.current === null) return "next";
    const learned = isLearned(this.current.record);
    if (learned && this.current.dict === "learn") return "offer-move-to-repeat";
    if (this.lastAnswerRight && learned && this.current.dict === "repeat") return "offer-delete";
    if (!this.lastAnswerRight && this.current.dict === "repeat") return "offer-move-to-learn";
    return "next";
  }

  /**
   * Moves the current word to the other dictionary (clearing its stats),
   * saves both files, and clears the current word so the next draw starts
   * fresh. Returns false (saving nothing) when there is no current word.
   */
  async moveCurrent(): Promise<boolean> {
    if (this.current === null) return false;
    const record = this.current.record;
    const source = this.activeDict();
    const target = this.current.dict === "learn" ? this.repeatDict : this.learnDict;
    if (!source.removeWord(record)) return false;
    clearStats(record);
    target.addWord(record);
    await target.save(this.fileStore);
    await source.save(this.fileStore);
    this.current = null;
    return true;
  }

  /**
   * Deletes the current word from its dictionary, saves that file, and
   * clears the current word. Returns false (saving nothing) when there is no
   * current word.
   */
  async deleteCurrent(): Promise<boolean> {
    if (this.current === null) return false;
    const source = this.activeDict();
    if (!source.removeWord(this.current.record)) return false;
    await source.save(this.fileStore);
    this.current = null;
    return true;
  }

  /** The active dictionary's size, for the header. */
  activeDictSize(): number {
    return this.activeDict().count();
  }
}
