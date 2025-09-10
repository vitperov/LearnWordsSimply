/**
 * Word record: the in-memory form of one line of a `.dic` file
 * (`word;translation;wCount;tCount;wtHistory;twHistory`).
 *
 * Plain erasable TypeScript — no react/expo imports here.
 */

export interface WordRecord {
  word: string;
  translation: string;
  wCount: number;
  tCount: number;
  wtHistory: string;
  twHistory: string;
  dirW2T: boolean;
}

/**
 * Parses one `.dic` line into a record, or returns null when the line is
 * unusable. Never throws; malformed input yields null (callers drop it).
 *
 * Behavior: a trailing `\r` (CRLF files) is stripped before splitting;
 * splitting is on `;`. Fewer than 2 fields, an empty word, or an empty
 * translation → null. A line of 2–5 fields uses legacy defaults: counts 0,
 * histories `-`. Six or more fields parse counts as integers (non-numeric →
 * 0, negative kept as-is), histories verbatim from fields 4/5; extra fields
 * are ignored. A newline inside a field is preserved verbatim; a `;` inside
 * word/translation degrades the parse safely but does not throw.
 */
export function parseWordRecord(line: string): WordRecord | null {
  const withoutCr = line.endsWith("\r") ? line.slice(0, -1) : line;
  const fields = withoutCr.split(";");
  if (fields.length < 2) return null;
  const [word, translation] = fields;
  if (word === "" || translation === "") return null;
  if (fields.length < 6) {
    return {
      word,
      translation,
      wCount: 0,
      tCount: 0,
      wtHistory: "-",
      twHistory: "-",
      dirW2T: true,
    };
  }
  return {
    word,
    translation,
    wCount: parseCount(fields[2]),
    tCount: parseCount(fields[3]),
    wtHistory: fields[4],
    twHistory: fields[5],
    dirW2T: true,
  };
}

/** Integer field parse: non-numeric → 0, negatives kept as-is. */
function parseCount(field: string): number {
  if (!/^[+-]?\d+$/.test(field)) return 0;
  return parseInt(field, 10);
}

/**
 * Packs a record back to the exact `.dic` line: decimal counts, the field
 * order `word;translation;wCount;tCount;wtHistory;twHistory`, and one
 * trailing newline.
 */
export function packWordRecord(record: WordRecord): string {
  return (
    `${record.word};${record.translation};${record.wCount};${record.tCount};` +
    `${record.wtHistory};${record.twHistory}\n`
  );
}

/**
 * Builds a record for a freshly entered word/translation pair. Returns null
 * when either string is empty or contains `;` or `\n` — such words cannot
 * round-trip the packed format.
 */
export function makeWordRecord(word: string, translation: string): WordRecord | null {
  if (word === "" || translation === "") return null;
  if (word.includes(";") || translation.includes(";")) return null;
  if (word.includes("\n") || translation.includes("\n")) return null;
  return {
    word,
    translation,
    wCount: 0,
    tCount: 0,
    wtHistory: "",
    twHistory: "",
    dirW2T: true,
  };
}

/**
 * Records one answer for the record's current direction: increments the
 * direction's count (wCount for w2t, tCount for t2w) and appends `+` (right)
 * or `-` (wrong) to that direction's history. A history longer than 5
 * characters is trimmed to its last 5. Mutates the record in place.
 */
export function recordAnswer(record: WordRecord, right: boolean): void {
  const mark = right ? "+" : "-";
  if (record.dirW2T) {
    record.wCount += 1;
    record.wtHistory = capHistory(record.wtHistory + mark);
  } else {
    record.tCount += 1;
    record.twHistory = capHistory(record.twHistory + mark);
  }
}

/** Appends grow the history; only its last 5 characters are kept. */
function capHistory(history: string): string {
  return history.length > 5 ? history.slice(-5) : history;
}

/** w2t progress: the count of `+` in wtHistory × 20, capped at 100. */
export function getWtProgress(record: WordRecord): number {
  return historyProgress(record.wtHistory);
}

/** t2w progress: the count of `+` in twHistory × 20, capped at 100. */
export function getTwProgress(record: WordRecord): number {
  return historyProgress(record.twHistory);
}

/** Progress for the record's current direction (per dirW2T). */
export function getProgress(record: WordRecord): number {
  return record.dirW2T ? getWtProgress(record) : getTwProgress(record);
}

/** `+` marks × 20, capped at 100 (damaged over-long histories included). */
function historyProgress(history: string): number {
  let plus = 0;
  for (const ch of history) {
    if (ch === "+") plus += 1;
  }
  return Math.min(plus * 20, 100);
}

/** True when wtProgress + twProgress reaches 200. */
export function isLearned(record: WordRecord): boolean {
  return getWtProgress(record) + getTwProgress(record) >= 200;
}

/**
 * Resolves a requested direction (true = w2t). A mastered side is skipped:
 * when wt ≥ 100 and tw < 100 the answer is t2w; when tw ≥ 100 and wt < 100
 * the answer is w2t; otherwise the request is honored. Does not mutate.
 */
export function setDirection(record: WordRecord, w2tRequested: boolean): boolean {
  const wt = getWtProgress(record);
  const tw = getTwProgress(record);
  if (wt >= 100 && tw < 100) return false;
  if (tw >= 100 && wt < 100) return true;
  return w2tRequested;
}

/** The shown text for the current direction. */
export function getWord(record: WordRecord): string {
  return record.dirW2T ? record.word : record.translation;
}

/** The expected answer text for the current direction. */
export function getAnswer(record: WordRecord): string {
  return record.dirW2T ? record.translation : record.word;
}

/** Resets the record's stats: counts to 0, histories to empty strings. */
export function clearStats(record: WordRecord): void {
  record.wCount = 0;
  record.tCount = 0;
  record.wtHistory = "";
  record.twHistory = "";
}

/** Exact, case-sensitive word-text equality. */
export function isSameWord(a: WordRecord, b: WordRecord): boolean {
  return a.word === b.word;
}
