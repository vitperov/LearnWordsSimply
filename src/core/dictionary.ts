/**
 * Dictionary: the in-memory record list for one `.dic` file, loaded and
 * saved whole through a FileStore port.
 *
 * Plain erasable TypeScript — no react/expo imports here.
 */

import type { FileStore } from "./file-store.ts";
import {
  isSameWord,
  makeWordRecord,
  packWordRecord,
  parseWordRecord,
  setDirection,
  type WordRecord,
} from "./word-record.ts";

/**
 * Holds the in-memory list for one file (e.g. "user.dic"). Duplicates (same
 * word text) may coexist; removal is first-match; save rewrites the whole
 * file from the in-memory list, leaving that list intact on write failure.
 */
export class Dictionary {
  private fileName: string;
  private records: WordRecord[] = [];
  /** Slots of the last 5 draws, per instance; see pickRandom. */
  private recentSlots: number[] = [];

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  /**
   * Loads the dictionary's file via the store. A missing file yields an
   * empty dictionary (the file is created on first save). Lines split on
   * `\n` (trailing `\r` stripped), parsed and dropped when invalid, order
   * preserved. A present-but-unreadable file rejects.
   */
  async load(fileStore: FileStore): Promise<void> {
    const text = await fileStore.readFile(this.fileName);
    if (text === null) {
      this.records = [];
      return;
    }
    const records: WordRecord[] = [];
    for (const line of text.split("\n")) {
      const record = parseWordRecord(line);
      if (record !== null) records.push(record);
    }
    this.records = records;
  }

  /**
   * Packs every record in order into one text blob and writes it via the
   * store. Write failures reject upward; the in-memory list stays intact.
   */
  async save(fileStore: FileStore): Promise<void> {
    let text = "";
    for (const record of this.records) {
      text += packWordRecord(record);
    }
    await fileStore.writeFile(this.fileName, text);
  }

  /**
   * Appends a valid record; an invalid record (empty word/translation, or
   * containing `;`/newline) is a no-op. Stats are stored as given — clearing
   * stats for freshly added words is the caller's job.
   */
  addWord(record: WordRecord): void {
    if (makeWordRecord(record.word, record.translation) === null) return;
    this.records.push(record);
  }

  /**
   * Appends every valid record in order, skipping invalid ones. Returns the
   * number appended.
   */
  appendAll(records: WordRecord[]): number {
    let appended = 0;
    for (const record of records) {
      if (makeWordRecord(record.word, record.translation) === null) continue;
      this.records.push(record);
      appended += 1;
    }
    return appended;
  }

  /**
   * Removes the first record matching by word text (case-sensitive).
   * Returns whether anything was removed.
   */
  removeWord(record: WordRecord): boolean {
    const index = this.records.findIndex((existing) => isSameWord(existing, record));
    if (index === -1) return false;
    this.records.splice(index, 1);
    return true;
  }

  /** Number of records held. */
  count(): number {
    return this.records.length;
  }

  /** Snapshot array in file order; mutating it does not affect the list. */
  getAll(): WordRecord[] {
    return [...this.records];
  }

  /**
   * Picks a random record in a random direction. The rng returns [0,1) and
   * defaults to Math.random.
   *
   * Slot mechanics: slot = floor(rng() × 2N); word index = slot / 2;
   * requested direction = slot % 2 (0 → t2w, 1 → w2t). setDirection may
   * force the unmastered side. The drawn slot joins the recent-slot list
   * (capped at 5); a candidate slot among the last 5 drawn is re-drawn, but
   * only when 2N > 5 — with 5 or fewer slots the guard disengages. An empty
   * dictionary yields null.
   */
  pickRandom(rng: () => number = Math.random): { record: WordRecord; direction: boolean } | null {
    const totalSlots = this.records.length * 2;
    if (totalSlots < 2) return null;
    let slot: number;
    do {
      slot = Math.floor(rng() * totalSlots);
    } while (totalSlots > 5 && this.recentSlots.includes(slot));
    this.recentSlots.push(slot);
    if (this.recentSlots.length > 5) this.recentSlots.shift();
    const record = this.records[Math.floor(slot / 2)]!;
    const direction = setDirection(record, slot % 2 === 1);
    return { record, direction };
  }
}
