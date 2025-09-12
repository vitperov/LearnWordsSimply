/**
 * FileStore adapter over expo-file-system — the only RN-bound storage file.
 *
 * Maps the two logical dictionary names ("user.dic", "repeat.dic") onto the
 * app's external files directory — the same on-device location the original
 * application wrote (same applicationId), so installing over the old app
 * picks up the existing dictionaries with zero migration steps. Text is
 * UTF-8; a missing file reads as null; I/O failures reject. Not unit-tested
 * (hard device dependency); typed to satisfy the FileStore port.
 *
 * The external directory is only usable when new files can be created in it:
 * the platform denies operations on non-existent paths in that tree, so on a
 * fresh install (no files inherited from the old application) the store falls
 * back to the internal documents directory, seeded once from whatever legacy
 * dictionary files are still readable at the external location.
 */

import { Directory, File, Paths } from "expo-file-system";

import type { FileStore } from "../core/file-store.ts";

/** The original application's external files directory (same applicationId). */
const LEGACY_EXTERNAL_DIR =
  "file:///storage/emulated/0/Android/data/eu.vt_tech.learnwordssimply/files";

/** The two dictionary files, seeded from the legacy location on fallback. */
const DICTIONARY_FILES = ["user.dic", "repeat.dic"];

const PROBE_FILE_NAME = ".learn-words-simply-write-probe";
const PROBE_CONTENT = "write-probe";

export class ExpoFileStore implements FileStore {
  private root: Promise<Directory> | null = null;

  async readFile(name: string): Promise<string | null> {
    const file = new File(await this.resolveRoot(), name);
    if (!file.exists) {
      return null;
    }
    return await file.text();
  }

  async writeFile(name: string, text: string): Promise<void> {
    const file = new File(await this.resolveRoot(), name);
    await file.write(text);
  }

  /**
   * Resolves the directory the dictionary files live in, once per store
   * instance. A failed resolution is not memoized, so the next call retries
   * (a save surfaced as an error stays retriable on the next mutation).
   */
  private resolveRoot(): Promise<Directory> {
    if (!this.root) {
      this.root = this.chooseRoot().catch((error: unknown) => {
        this.root = null;
        throw error;
      });
    }
    return this.root;
  }

  /**
   * Prefers the external directory — the old application's location — when
   * new files can be created there; otherwise falls back to the internal
   * documents directory, seeded from the legacy files.
   */
  private async chooseRoot(): Promise<Directory> {
    const external = new Directory(LEGACY_EXTERNAL_DIR);
    if (await canCreateNewFiles(external)) {
      return external;
    }
    const internal = Paths.document;
    await seedFromLegacy(external, internal);
    return internal;
  }
}

/**
 * Whether new files can be created in the directory. Probed by writing a
 * throwaway file: an earlier successful probe leaves the file behind, which
 * short-circuits later probes. Reading `exists` never throws (it is false
 * without read access), and a denied write is the fresh-install signature.
 */
async function canCreateNewFiles(dir: Directory): Promise<boolean> {
  const probe = new File(dir, PROBE_FILE_NAME);
  if (probe.exists) {
    return true;
  }
  try {
    await probe.write(PROBE_CONTENT);
  } catch {
    return false;
  }
  try {
    probe.delete();
  } catch {
    // the lingering probe just short-circuits future probes
  }
  return true;
}

/**
 * First-launch copy from the legacy external location: each dictionary file
 * readable there is written into the target directory when the target does
 * not have it yet. Read or write failures reject — surfaced as the load
 * alert, and the copy retries on the next launch because the target file is
 * still missing.
 */
async function seedFromLegacy(legacyDir: Directory, targetDir: Directory): Promise<void> {
  for (const name of DICTIONARY_FILES) {
    const legacy = new File(legacyDir, name);
    const target = new File(targetDir, name);
    if (!legacy.exists || target.exists) {
      continue;
    }
    await target.write(await legacy.text());
  }
}
