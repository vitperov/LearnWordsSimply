/**
 * Storage port: dictionaries read and write whole text files through this
 * interface and never touch expo-file-system directly. The real adapter
 * (src/storage/expo-file-store.ts) is the only RN-bound file.
 *
 * Plain erasable TypeScript — no react/expo imports here.
 */

export interface FileStore {
  /** File text, or null when the file does not exist. I/O failures reject. */
  readFile(name: string): Promise<string | null>;
  /** Writes (overwrites) the file as UTF-8 text. I/O failures reject. */
  writeFile(name: string, text: string): Promise<void>;
}

/**
 * In-memory fake backing the unit tests: per-instance state, files are
 * independent by name, the latest write wins, and reading a name that was
 * never written resolves to null (not a rejection).
 */
export class InMemoryFileStore implements FileStore {
  private files = new Map<string, string>();

  async readFile(name: string): Promise<string | null> {
    const text = this.files.get(name);
    return text === undefined ? null : text;
  }

  async writeFile(name: string, text: string): Promise<void> {
    this.files.set(name, text);
  }
}
