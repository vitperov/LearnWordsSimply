/// <reference types="node" />
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Dictionary } from "../src/core/dictionary.ts";
import { InMemoryFileStore } from "../src/core/file-store.ts";
import { packWordRecord } from "../src/core/word-record.ts";

interface WordRecord {
  word: string;
  translation: string;
  wCount: number;
  tCount: number;
  wtHistory: string;
  twHistory: string;
  dirW2T: boolean;
}

function rec(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    word: "cat",
    translation: "кошка",
    wCount: 0,
    tCount: 0,
    wtHistory: "-",
    twHistory: "-",
    dirW2T: true,
    ...overrides,
  };
}

function stats(r: WordRecord) {
  return {
    word: r.word,
    translation: r.translation,
    wCount: r.wCount,
    tCount: r.tCount,
    wtHistory: r.wtHistory,
    twHistory: r.twHistory,
  };
}

/** Deterministic rng: yields the given values in order, then throws. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) {
      throw new Error("rng sequence exhausted");
    }
    return values[i++]!;
  };
}

/** A file store whose I/O always fails with the given reason. */
function failingStore(reason: string) {
  return {
    readFile: async (_name: string): Promise<string | null> => {
      throw new Error(reason);
    },
    writeFile: async (_name: string, _text: string): Promise<void> => {
      throw new Error(reason);
    },
  };
}

describe("load", () => {
  it("resolves to an empty dictionary when the file is missing", async () => {
    const dict = new Dictionary("user.dic");
    await dict.load(new InMemoryFileStore());
    assert.equal(dict.count(), 0);
    assert.deepEqual(dict.getAll(), []);
  });

  it("splits lines, strips trailing carriage returns, drops invalid lines, preserves order", async () => {
    const store = new InMemoryFileStore();
    await store.writeFile(
      "user.dic",
      "cat;кошка;1;2;+-;--\r\ndog;собака\r\n\r\nbroken\r\ngood;ok\r\n",
    );
    const dict = new Dictionary("user.dic");
    await dict.load(store);
    assert.equal(dict.count(), 3);
    assert.deepEqual(dict.getAll().map(stats), [
      { word: "cat", translation: "кошка", wCount: 1, tCount: 2, wtHistory: "+-", twHistory: "--" },
      { word: "dog", translation: "собака", wCount: 0, tCount: 0, wtHistory: "-", twHistory: "-" },
      { word: "good", translation: "ok", wCount: 0, tCount: 0, wtHistory: "-", twHistory: "-" },
    ]);
  });

  it("rejects when a present file cannot be read", async () => {
    const dict = new Dictionary("user.dic");
    await assert.rejects(dict.load(failingStore("io error")), /io error/);
  });
});

describe("save", () => {
  it("writes every record packed in order as one text blob to its own file", async () => {
    const store = new InMemoryFileStore();
    const dict = new Dictionary("user.dic");
    const cat = rec({ wCount: 3, tCount: 7, wtHistory: "+-+--", twHistory: "--+--" });
    const dog = rec({ word: "dog", translation: "собака" });
    dict.addWord(cat);
    dict.addWord(dog);
    await dict.save(store);
    assert.equal(await store.readFile("user.dic"), packWordRecord(cat) + packWordRecord(dog));
    assert.equal(await store.readFile("repeat.dic"), null);
  });

  it("round-trips records through save and load", async () => {
    const store = new InMemoryFileStore();
    const source = new Dictionary("user.dic");
    source.addWord(rec({ wCount: 3, tCount: 7, wtHistory: "+-+--", twHistory: "--+--" }));
    source.addWord(rec({ word: "dog", translation: "собака", dirW2T: false }));
    await source.save(store);
    const restored = new Dictionary("user.dic");
    await restored.load(store);
    assert.deepEqual(restored.getAll().map(stats), source.getAll().map(stats));
  });

  it("rejects upward when the write fails", async () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    await assert.rejects(dict.save(failingStore("disk full")), /disk full/);
  });

  it("leaves the in-memory list intact when the write fails", async () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    dict.addWord(rec({ word: "dog", translation: "собака" }));
    await assert.rejects(dict.save(failingStore("disk full")));
    assert.equal(dict.count(), 2);
    assert.deepEqual(dict.getAll().map((r) => r.word), ["cat", "dog"]);
  });
});

describe("addWord", () => {
  it("appends a valid record", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    assert.equal(dict.count(), 1);
    assert.deepEqual(stats(dict.getAll()[0]!), stats(rec()));
  });

  it("ignores a record with an empty word", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "" }));
    assert.equal(dict.count(), 0);
    assert.deepEqual(dict.getAll(), []);
  });

  it("ignores a record with an empty translation", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ translation: "" }));
    assert.equal(dict.count(), 0);
  });

  it("ignores a record containing ';' in the word", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "ca;t" }));
    assert.equal(dict.count(), 0);
  });

  it("ignores a record containing a newline in the translation", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ translation: "ко\nшка" }));
    assert.equal(dict.count(), 0);
  });

  it("stores the record's stats as given (clearing stats is the caller's job)", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ wCount: 3, tCount: 1, wtHistory: "+++", twHistory: "-" }));
    assert.deepEqual(stats(dict.getAll()[0]!), {
      word: "cat",
      translation: "кошка",
      wCount: 3,
      tCount: 1,
      wtHistory: "+++",
      twHistory: "-",
    });
  });

  it("allows duplicate word texts to coexist", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ translation: "кошка" }));
    dict.addWord(rec({ translation: "koshka" }));
    assert.equal(dict.count(), 2);
    assert.deepEqual(dict.getAll().map((r) => r.translation), ["кошка", "koshka"]);
  });
});

describe("appendAll", () => {
  it("appends valid records, skips invalid, returns the number appended", () => {
    const dict = new Dictionary("user.dic");
    const appended = dict.appendAll([
      rec({ word: "cat", translation: "кошка" }),
      rec({ word: "" }),
      rec({ word: "dog", translation: "собака" }),
      rec({ word: "ca;t" }),
    ]);
    assert.equal(appended, 2);
    assert.equal(dict.count(), 2);
    assert.deepEqual(dict.getAll().map((r) => r.word), ["cat", "dog"]);
  });

  it("returns 0 for an empty batch", () => {
    const dict = new Dictionary("user.dic");
    assert.equal(dict.appendAll([]), 0);
    assert.equal(dict.count(), 0);
  });

  it("appends after existing records in order", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "first", translation: "f" }));
    dict.appendAll([
      rec({ word: "second", translation: "s" }),
      rec({ word: "third", translation: "t" }),
    ]);
    assert.deepEqual(dict.getAll().map((r) => r.word), ["first", "second", "third"]);
  });
});

describe("removeWord", () => {
  it("removes the first record matching by word text and returns true", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ translation: "кошка" }));
    dict.addWord(rec({ translation: "koshka" }));
    dict.addWord(rec({ word: "dog", translation: "собака" }));
    assert.equal(dict.removeWord(rec({ translation: "koshka" })), true);
    assert.equal(dict.count(), 2);
    // matching is by word text only, so the first "cat" — the one with translation "кошка" — is gone
    assert.deepEqual(dict.getAll().map((r) => r.translation), ["koshka", "собака"]);
  });

  it("returns false and changes nothing when no record matches", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    assert.equal(dict.removeWord(rec({ word: "ghost" })), false);
    assert.equal(dict.count(), 1);
  });

  it("matches word text case-sensitively", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    assert.equal(dict.removeWord(rec({ word: "Cat" })), false);
    assert.equal(dict.count(), 1);
  });
});

describe("getAll", () => {
  it("returns a snapshot: mutating the returned array does not affect the dictionary", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec());
    const snapshot = dict.getAll();
    snapshot.push(rec({ word: "ghost" }));
    assert.equal(dict.count(), 1);
    assert.deepEqual(dict.getAll().map((r) => r.word), ["cat"]);
  });
});

describe("pickRandom", () => {
  it("maps slot parity to word index and direction", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    dict.addWord(rec({ word: "w2", translation: "t2" }));
    const rng = seq(0.0625, 0.25, 0.375, 0.5625, 0.6875, 0.875);
    const expected: Array<[string, boolean]> = [
      ["w0", false],
      ["w0", true],
      ["w1", false],
      ["w1", true],
      ["w2", false],
      ["w2", true],
    ];
    for (const [word, direction] of expected) {
      const draw = dict.pickRandom(rng);
      assert.ok(draw);
      assert.equal(draw.record.word, word);
      assert.equal(draw.direction, direction);
    }
  });

  it("re-draws when the candidate slot is among the last 5 drawn (2N > 5)", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    dict.addWord(rec({ word: "w2", translation: "t2" }));
    // setup: slots 0..4 become the recent list (one accepted draw per pickRandom call)
    const setup = seq(0.0625, 0.25, 0.375, 0.5625, 0.6875);
    for (let i = 0; i < 5; i++) dict.pickRandom(setup);
    // candidate slot 1 is recent, so a fresh slot 5 must win
    const draw = dict.pickRandom(seq(0.25, 0.875));
    assert.ok(draw);
    assert.equal(draw.record.word, "w2");
    assert.equal(draw.direction, true);
  });

  it("re-draws a slot that is exactly the 5th-most-recent drawn", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    dict.addWord(rec({ word: "w2", translation: "t2" }));
    // setup: slots 5,0,1,2,3,4 — slot 0 ends up as the oldest of the last 5 drawn
    const setup = seq(0.875, 0.0625, 0.25, 0.375, 0.5625, 0.6875);
    for (let i = 0; i < 6; i++) dict.pickRandom(setup);
    // candidate slot 0 is still among the last 5 drawn, so a fresh slot 5 must win
    const draw = dict.pickRandom(seq(0.0625, 0.875));
    assert.ok(draw);
    assert.equal(draw.record.word, "w2");
    assert.equal(draw.direction, true);
  });

  it("caps the recent-slot list at 5, so a slot drawn 6 draws ago is fresh again", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    dict.addWord(rec({ word: "w2", translation: "t2" }));
    // setup: slots 0..5 drawn; the recent list keeps only the last 5
    const setup = seq(0.0625, 0.25, 0.375, 0.5625, 0.6875, 0.875);
    for (let i = 0; i < 6; i++) dict.pickRandom(setup);
    // slot 0 was evicted, so it is accepted without a re-draw
    const draw = dict.pickRandom(seq(0.0625));
    assert.ok(draw);
    assert.equal(draw.record.word, "w0");
    assert.equal(draw.direction, false);
  });

  it("accepts an immediate repeat of the last slot when 2N <= 5", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    // 0.25 × 4 = slot 1 both times; with 2N = 4 the guard is disengaged
    const rng = seq(0.25, 0.25);
    const first = dict.pickRandom(rng);
    const second = dict.pickRandom(rng);
    assert.ok(first);
    assert.ok(second);
    assert.equal(first.record.word, "w0");
    assert.equal(second.record.word, "w0");
    assert.equal(first.direction, true);
    assert.equal(second.direction, true);
  });

  it("serves the single word in either direction for a one-word dictionary", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "solo", translation: "один" }));
    const t2w = dict.pickRandom(seq(0.25)); // 0.25 × 2 = 0.5 → slot 0 → t2w
    const w2t = dict.pickRandom(seq(0.75)); // 0.75 × 2 = 1.5 → slot 1 → w2t
    const again = dict.pickRandom(seq(0.75)); // guard disengaged at 2N = 2
    assert.ok(t2w);
    assert.ok(w2t);
    assert.ok(again);
    assert.equal(t2w.record.word, "solo");
    assert.equal(w2t.record.word, "solo");
    assert.equal(again.record.word, "solo");
    assert.equal(t2w.direction, false);
    assert.equal(w2t.direction, true);
    assert.equal(again.direction, true);
  });

  it("returns a nullish result for an empty dictionary", () => {
    const dict = new Dictionary("user.dic");
    const draw = dict.pickRandom(seq(0.5));
    assert.ok(draw === null || draw === undefined);
  });

  it("keeps the recent-slot list per dictionary instance", () => {
    const a = new Dictionary("user.dic");
    const b = new Dictionary("repeat.dic");
    for (const dict of [a, b]) {
      dict.addWord(rec({ word: "w0", translation: "t0" }));
      dict.addWord(rec({ word: "w1", translation: "t1" }));
      dict.addWord(rec({ word: "w2", translation: "t2" }));
    }
    a.pickRandom(seq(0.25)); // slot 1 recorded in a's list only
    // b must accept slot 1 immediately; a shared list would re-draw and exhaust the sequence
    const draw = b.pickRandom(seq(0.25));
    assert.ok(draw);
    assert.equal(draw.record.word, "w0");
    assert.equal(draw.direction, true);
  });

  it("forces the unmastered side via the setDirection override", () => {
    const wtMastered = new Dictionary("user.dic");
    wtMastered.addWord(rec({ wtHistory: "+++++", twHistory: "--" }));
    // slot 1 requests w2t, but wt is mastered and tw is not, so t2w is forced
    const w2tRequest = wtMastered.pickRandom(seq(0.75));
    assert.ok(w2tRequest);
    assert.equal(w2tRequest.direction, false);

    const twMastered = new Dictionary("repeat.dic");
    twMastered.addWord(rec({ wtHistory: "--", twHistory: "+++++" }));
    // slot 0 requests t2w, but tw is mastered and wt is not, so w2t is forced
    const t2wRequest = twMastered.pickRandom(seq(0.25));
    assert.ok(t2wRequest);
    assert.equal(t2wRequest.direction, true);
  });

  it("honors the requested direction when both sides are mastered", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ wtHistory: "+++++", twHistory: "+++++" }));
    const draw = dict.pickRandom(seq(0.75)); // slot 1 → w2t honored
    assert.ok(draw);
    assert.equal(draw.direction, true);
  });

  it("works without an rng argument (default randomness)", () => {
    const dict = new Dictionary("user.dic");
    dict.addWord(rec({ word: "w0", translation: "t0" }));
    dict.addWord(rec({ word: "w1", translation: "t1" }));
    const draw = dict.pickRandom();
    assert.ok(draw);
    assert.equal(typeof draw.direction, "boolean");
    assert.ok(["w0", "w1"].includes(draw.record.word));
  });
});
