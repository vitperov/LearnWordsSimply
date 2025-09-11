/// <reference types="node" />
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { LearningSession } from "../src/core/learning-session.ts";
import { Dictionary } from "../src/core/dictionary.ts";
import { InMemoryFileStore } from "../src/core/file-store.ts";

type Strategy = "new-only" | "repeat-only" | "8020";

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

/** Builds a session over two dictionaries loaded from an in-memory store. */
async function makeSession(options: {
  strategy: Strategy;
  userFile?: string;
  repeatFile?: string;
  rng?: () => number;
}): Promise<{
  session: LearningSession;
  store: InMemoryFileStore;
  learn: Dictionary;
  repeat: Dictionary;
}> {
  const store = new InMemoryFileStore();
  if (options.userFile !== undefined) {
    await store.writeFile("user.dic", options.userFile);
  }
  if (options.repeatFile !== undefined) {
    await store.writeFile("repeat.dic", options.repeatFile);
  }
  const learn = new Dictionary("user.dic");
  await learn.load(store);
  const repeat = new Dictionary("repeat.dic");
  await repeat.load(store);
  const session = new LearningSession(learn, repeat, options.strategy, store, options.rng);
  return { session, store, learn, repeat };
}

describe("nextWord strategy → dictionary", () => {
  it("new-only draws from the learn dictionary", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: "main;слово;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
      rng: seq(0.75), // 0.75 × 2 = 1.5 → slot 1 → w2t of the single learn word
    });
    const draw = session.nextWord();
    assert.ok(draw);
    assert.equal(draw.dict, "learn");
    assert.equal(draw.record.word, "main");
    assert.equal(draw.direction, true);
  });

  it("repeat-only draws from the repeat dictionary", async () => {
    const { session } = await makeSession({
      strategy: "repeat-only",
      userFile: "main;слово;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
      rng: seq(0.75),
    });
    const draw = session.nextWord();
    assert.ok(draw);
    assert.equal(draw.dict, "repeat");
    assert.equal(draw.record.word, "rep");
    assert.equal(draw.direction, true);
  });

  it("8020 draws from the repeat dictionary when rng < 0.2", async () => {
    const { session } = await makeSession({
      strategy: "8020",
      userFile: "main;слово;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
      rng: seq(0.1, 0.75), // 0.1 < 0.2 → repeat; then 0.75 × 2 = 1.5 → slot 1 → w2t
    });
    const draw = session.nextWord();
    assert.ok(draw);
    assert.equal(draw.dict, "repeat");
    assert.equal(draw.record.word, "rep");
    assert.equal(draw.direction, true);
  });

  it("8020 draws from the learn dictionary when rng >= 0.2", async () => {
    const { session } = await makeSession({
      strategy: "8020",
      userFile: "main;слово;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
      rng: seq(0.5, 0.75), // 0.5 >= 0.2 → learn; then 0.75 × 2 = 1.5 → slot 1 → w2t
    });
    const draw = session.nextWord();
    assert.ok(draw);
    assert.equal(draw.dict, "learn");
    assert.equal(draw.record.word, "main");
    assert.equal(draw.direction, true);
  });

  it("8020 falls back to the learn dictionary when rng < 0.2 but repeat is empty", async () => {
    const { session } = await makeSession({
      strategy: "8020",
      userFile: "main;слово;0;0;-;-\n",
      rng: seq(0.1, 0.75), // 0.1 < 0.2 but repeat is empty → learn; then 0.75 × 2 = 1.5 → slot 1
    });
    const draw = session.nextWord();
    assert.ok(draw);
    assert.equal(draw.dict, "learn");
    assert.equal(draw.record.word, "main");
    assert.equal(draw.direction, true);
  });

  it("repeat-only with an empty repeat dictionary returns null (no fallback to learn)", async () => {
    const { session } = await makeSession({
      strategy: "repeat-only",
      userFile: "main;слово;0;0;-;-\n",
    });
    assert.equal(session.nextWord(), null);
  });

  it("returns null when there are no words at all", async () => {
    const { session } = await makeSession({ strategy: "new-only" });
    assert.equal(session.nextWord(), null);
  });

  it("exposes the active dictionary's size after the draw", async () => {
    const { session } = await makeSession({
      strategy: "8020",
      userFile: "main1;с1;0;0;-;-\nmain2;с2;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
      rng: seq(0.5, 0.75, 0.1, 0.25),
    });
    const fromLearn = session.nextWord(); // 0.5 → learn; 0.75 × 4 = 3 → slot 3 → second learn word
    assert.ok(fromLearn);
    assert.equal(fromLearn.record.word, "main2");
    assert.equal(session.activeDictSize(), 2);
    const fromRepeat = session.nextWord(); // 0.1 → repeat; 0.25 × 2 = 0.5 → slot 0
    assert.ok(fromRepeat);
    assert.equal(fromRepeat.record.word, "rep");
    assert.equal(session.activeDictSize(), 1);
  });
});

describe("last-5 guard across session draws", () => {
  it("re-draws a recent slot across nextWord calls when 2N > 5", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: "w0;t0;0;0;-;-\nw1;t1;0;0;-;-\nw2;t2;0;0;-;-\n",
      rng: seq(0.0625, 0.25, 0.375, 0.5625, 0.6875, 0.25, 0.875),
    });
    const draws = [
      session.nextWord(), // 0.0625 × 6 = 0.375 → slot 0
      session.nextWord(), // 0.25 × 6 = 1.5 → slot 1
      session.nextWord(), // 0.375 × 6 = 2.25 → slot 2
      session.nextWord(), // 0.5625 × 6 = 3.375 → slot 3
      session.nextWord(), // 0.6875 × 6 = 4.125 → slot 4
    ];
    assert.deepEqual(
      draws.map((d) => [d!.record.word, d!.direction]),
      [
        ["w0", false],
        ["w0", true],
        ["w1", false],
        ["w1", true],
        ["w2", false],
      ],
    );
    // slot 1 is among the last 5 drawn, so it is re-drawn to the fresh slot 5
    const sixth = session.nextWord(); // 0.25 → slot 1 rejected → 0.875 × 6 = 5.25 → slot 5
    assert.ok(sixth);
    assert.equal(sixth.record.word, "w2");
    assert.equal(sixth.direction, true);
  });

  it("accepts an immediate slot repeat across nextWord calls when 2N <= 5", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: "w0;t0;0;0;-;-\nw1;t1;0;0;-;-\n",
      rng: seq(0.25, 0.25), // 0.25 × 4 = 1 → slot 1 both times; 2N = 4 disengages the guard
    });
    const first = session.nextWord();
    const second = session.nextWord();
    assert.ok(first);
    assert.ok(second);
    assert.equal(first.record.word, "w0");
    assert.equal(first.direction, true);
    assert.equal(second.record.word, "w0");
    assert.equal(second.direction, true);
  });
});

describe("postAnswerAction disposition order", () => {
  const LEARNED = "cat;кошка;0;0;+++++;+++++\n";
  const PLAIN = "cat;кошка;0;0;-;-\n";

  it("learned + right in learn dict → offer-move-to-repeat", async () => {
    const { session, store } = await makeSession({
      strategy: "new-only",
      userFile: LEARNED,
      rng: seq(0.75), // slot 1 → w2t; both sides mastered so the request is honored
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true); // wCount 1, wt history stays "+++++" (trimmed to last 5)
    // the answer is saved immediately, before the offer is even evaluated
    assert.equal(await store.readFile("user.dic"), "cat;кошка;1;0;+++++;+++++\n");
    assert.equal(session.postAnswerAction(), "offer-move-to-repeat");
  });

  it("learned + wrong in learn dict → next (learned is evaluated on the post-answer record)", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: LEARNED,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(false); // wt history "++++-" → 80 + 100 = 180 → no longer learned
    assert.equal(session.postAnswerAction(), "next");
  });

  it("learned + right in repeat dict → offer-delete", async () => {
    const { session, store } = await makeSession({
      strategy: "repeat-only",
      repeatFile: LEARNED,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true);
    // recordAnswer saved the active (repeat) dictionary immediately
    assert.equal(await store.readFile("repeat.dic"), "cat;кошка;1;0;+++++;+++++\n");
    assert.equal(session.postAnswerAction(), "offer-delete");
  });

  it("learned + wrong in repeat dict → offer-move-to-learn", async () => {
    const { session } = await makeSession({
      strategy: "repeat-only",
      repeatFile: LEARNED,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(false); // no longer learned post-answer; still wrong in repeat
    assert.equal(session.postAnswerAction(), "offer-move-to-learn");
  });

  it("unlearned + wrong in repeat dict → offer-move-to-learn", async () => {
    const { session } = await makeSession({
      strategy: "repeat-only",
      repeatFile: PLAIN,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(false);
    assert.equal(session.postAnswerAction(), "offer-move-to-learn");
  });

  it("unlearned + right in repeat dict → next", async () => {
    const { session } = await makeSession({
      strategy: "repeat-only",
      repeatFile: PLAIN,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true); // wt history "-+" → progress 20 → not learned
    assert.equal(session.postAnswerAction(), "next");
  });

  it("unlearned + right in learn dict → next", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: PLAIN,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true);
    assert.equal(session.postAnswerAction(), "next");
  });

  it("unlearned + wrong in learn dict → next", async () => {
    const { session } = await makeSession({
      strategy: "new-only",
      userFile: PLAIN,
      rng: seq(0.75),
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(false);
    assert.equal(session.postAnswerAction(), "next");
  });
});

describe("recordAnswer saves the active dictionary immediately", () => {
  it("writes the updated stats to the active dictionary's file without an explicit save", async () => {
    const { session, store } = await makeSession({
      strategy: "new-only",
      userFile: "cat;кошка;0;0;-;-\n",
      rng: seq(0.75), // slot 1 → w2t
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true); // wCount 1, wt history "-+"
    assert.equal(await store.readFile("user.dic"), "cat;кошка;1;0;-+;-\n");
  });
});

describe("moveCurrent", () => {
  it("moves the current word from learn to repeat, clears its stats, and saves both files", async () => {
    const { session, store, learn, repeat } = await makeSession({
      strategy: "new-only",
      userFile: "cat;кошка;3;1;+++;-\nfiller;заполнитель;0;0;-;-\n",
      repeatFile: "dog;собака;0;0;-;-\n",
      rng: seq(0.25, 0.25), // 0.25 × 4 = 1 → slot 1 → the first learn word; second 0.25 for the post-move draw
    });
    assert.ok(session.nextWord());
    assert.equal(await session.moveCurrent(), true);
    assert.equal(await store.readFile("user.dic"), "filler;заполнитель;0;0;-;-\n");
    assert.equal(
      await store.readFile("repeat.dic"),
      "dog;собака;0;0;-;-\ncat;кошка;0;0;;\n", // appended after dog, stats cleared
    );
    // unsaved words make a wrongful save on the false path detectable
    learn.addWord(rec({ word: "ghost", translation: "призрак" }));
    repeat.addWord(rec({ word: "ghost2", translation: "призрак2" }));
    // the current word was cleared by the move: a second move has nothing to act on
    assert.equal(await session.moveCurrent(), false);
    assert.equal(await store.readFile("user.dic"), "filler;заполнитель;0;0;-;-\n");
    assert.equal(
      await store.readFile("repeat.dic"),
      "dog;собака;0;0;-;-\ncat;кошка;0;0;;\n",
    );
    // the next draw starts fresh from the post-move state
    const next = session.nextWord(); // 0.25 × 2 = 0.5 → slot 0 → the only remaining learn word
    assert.ok(next);
    assert.equal(next.record.word, "filler");
  });

  it("moves the current word from repeat to learn (move to main), clears its stats, and saves both files", async () => {
    const { session, store } = await makeSession({
      strategy: "repeat-only",
      userFile: "dog;собака;0;0;-;-\n",
      repeatFile: "cat;кошка;3;1;+++;-\n",
      rng: seq(0.25), // 0.25 × 2 = 0.5 → slot 0 → t2w
    });
    assert.ok(session.nextWord());
    assert.equal(await session.moveCurrent(), true);
    assert.equal(await store.readFile("repeat.dic"), "");
    assert.equal(
      await store.readFile("user.dic"),
      "dog;собака;0;0;-;-\ncat;кошка;0;0;;\n",
    );
  });
});

describe("deleteCurrent", () => {
  it("deletes the current word from the learn dictionary, saves its file, and leaves the repeat file untouched", async () => {
    const { session, store, learn, repeat } = await makeSession({
      strategy: "new-only",
      userFile: "cat;кошка;0;0;-;-\nfiller;заполнитель;0;0;-;-\n",
      rng: seq(0.25), // 0.25 × 4 = 1 → slot 1 → the first learn word
    });
    // an unsaved repeat word: if deleteCurrent wrongly saved repeat.dic, it would appear in the file
    repeat.addWord(rec({ word: "dog", translation: "собака" }));
    assert.ok(session.nextWord());
    assert.equal(await session.deleteCurrent(), true);
    assert.equal(await store.readFile("user.dic"), "filler;заполнитель;0;0;-;-\n");
    assert.equal(await store.readFile("repeat.dic"), null);
  });

  it("deletes the current word from the repeat dictionary, saves its file, and leaves the learn file untouched", async () => {
    const { session, store, learn } = await makeSession({
      strategy: "repeat-only",
      repeatFile: "cat;кошка;0;0;-;-\n",
      rng: seq(0.25), // 0.25 × 2 = 0.5 → slot 0 → t2w
    });
    learn.addWord(rec({ word: "dog", translation: "собака" }));
    assert.ok(session.nextWord());
    assert.equal(await session.deleteCurrent(), true);
    assert.equal(await store.readFile("repeat.dic"), "");
    assert.equal(await store.readFile("user.dic"), null);
  });
});

describe("declining an offer", () => {
  it("keeps the word and the recorded answer, and proceeds to the next draw", async () => {
    const { session, store } = await makeSession({
      strategy: "new-only",
      userFile: "cat;кошка;0;0;+++++;+++++\n",
      rng: seq(0.75, 0.75), // single-word dictionary: slot 1 on both draws
    });
    assert.ok(session.nextWord());
    await session.recordAnswer(true);
    assert.equal(session.postAnswerAction(), "offer-move-to-repeat");
    // decline: proceed straight to the next draw — no move, no delete
    const next = session.nextWord();
    assert.ok(next);
    assert.equal(next.dict, "learn");
    assert.equal(next.record.word, "cat");
    // the recorded answer stands in the file; nothing was moved
    assert.equal(await store.readFile("user.dic"), "cat;кошка;1;0;+++++;+++++\n");
    assert.equal(await store.readFile("repeat.dic"), null);
  });
});

describe("move/delete with no current word", () => {
  it("returns false and saves nothing before any word is drawn", async () => {
    const { session, store, learn, repeat } = await makeSession({
      strategy: "new-only",
      userFile: "seed;слово;0;0;-;-\n",
      repeatFile: "rep;перевод;0;0;-;-\n",
    });
    // unsaved words make a wrongful save detectable in the file contents
    learn.addWord(rec({ word: "ghost", translation: "призрак" }));
    repeat.addWord(rec({ word: "ghost2", translation: "призрак2" }));
    assert.equal(await session.moveCurrent(), false);
    assert.equal(await session.deleteCurrent(), false);
    assert.equal(await store.readFile("user.dic"), "seed;слово;0;0;-;-\n");
    assert.equal(await store.readFile("repeat.dic"), "rep;перевод;0;0;-;-\n");
  });

  it("returns false and saves nothing after the current word was already removed", async () => {
    const { session, store, learn, repeat } = await makeSession({
      strategy: "new-only",
      userFile: "cat;кошка;0;0;-;-\n",
      rng: seq(0.75), // slot 1 → w2t
    });
    assert.ok(session.nextWord());
    assert.equal(await session.deleteCurrent(), true);
    learn.addWord(rec({ word: "ghost", translation: "призрак" }));
    repeat.addWord(rec({ word: "ghost2", translation: "призрак2" }));
    assert.equal(await session.deleteCurrent(), false);
    assert.equal(await session.moveCurrent(), false);
    assert.equal(await store.readFile("user.dic"), "");
    assert.equal(await store.readFile("repeat.dic"), null);
  });
});
