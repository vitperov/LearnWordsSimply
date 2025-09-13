/**
 * Import from a picked document: expo-document-picker → read text → parse →
 * Dictionary.appendAll.
 */

import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";

import type { Dictionary } from "../core/dictionary.ts";
import type { FileStore } from "../core/file-store.ts";
import { parseWordRecord } from "../core/word-record.ts";
import type { WordRecord } from "../core/word-record.ts";

/**
 * Runs the import pipeline against the target dictionary and returns the
 * number of words appended, or null when the user cancelled the picker (no
 * state changes, no message).
 *
 * Pipeline: pick a plain-text document (filter text/plain); read its content
 * as UTF-8 text; split lines (trailing `\r` stripped by the parser); parse
 * each line, dropping invalid ones exactly like a dictionary load; appendAll
 * the valid records in file order; save the dictionary. Reading the picked
 * file (or saving) fails → throw with the reason (the screen alerts; the
 * appended records stay in memory, the file is retried on the next save).
 */
export async function importFromDocument(
  target: Dictionary,
  fileStore: FileStore,
): Promise<number | null> {
  const result = await getDocumentAsync({ type: "text/plain" });
  if (result.canceled) {
    return null;
  }
  const uri = result.assets[0]?.uri;
  if (uri === undefined) {
    return null;
  }

  const text = await new File(uri).text();
  const records: WordRecord[] = [];
  for (const line of text.split("\n")) {
    const record = parseWordRecord(line);
    if (record !== null) records.push(record);
  }

  const appended = target.appendAll(records);
  await target.save(fileStore);
  return appended;
}
