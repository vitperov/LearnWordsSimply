/// <reference types="node" />
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseWordRecord,
  packWordRecord,
  recordAnswer,
  getWtProgress,
  getTwProgress,
  getProgress,
  isLearned,
  setDirection,
  getWord,
  getAnswer,
  clearStats,
  isSameWord,
  makeWordRecord,
} from "../src/core/word-record.ts";

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

describe("parseWordRecord", () => {
  it("parses a valid 6-field line into all fields", () => {
    const r = parseWordRecord("cat;кошка;3;7;+-+--;--+--");
    assert.ok(r);
    assert.deepEqual(stats(r), {
      word: "cat",
      translation: "кошка",
      wCount: 3,
      tCount: 7,
      wtHistory: "+-+--",
      twHistory: "--+--",
    });
  });

  it("applies legacy defaults to a 2-field line", () => {
    const r = parseWordRecord("cat;кошка");
    assert.ok(r);
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
    assert.equal(r.wtHistory, "-");
    assert.equal(r.twHistory, "-");
  });

  it("applies the flat legacy rule to a 3-field line even with a count field present", () => {
    const r = parseWordRecord("cat;кошка;5");
    assert.ok(r);
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
    assert.equal(r.wtHistory, "-");
    assert.equal(r.twHistory, "-");
  });

  it("applies the flat legacy rule to a 5-field line", () => {
    const r = parseWordRecord("cat;кошка;5;9;+-");
    assert.ok(r);
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
    assert.equal(r.wtHistory, "-");
    assert.equal(r.twHistory, "-");
  });

  it("returns null for a line with fewer than 2 fields", () => {
    assert.equal(parseWordRecord("justaword"), null);
  });

  it("returns null when the word field is empty", () => {
    assert.equal(parseWordRecord(";кошка;0;0;-;-"), null);
  });

  it("returns null when the translation field is empty", () => {
    assert.equal(parseWordRecord("cat;;0;0;-;-"), null);
  });

  it("returns null for an empty line", () => {
    assert.equal(parseWordRecord(""), null);
  });

  it("strips a trailing \r before splitting", () => {
    const r = parseWordRecord("cat;кошка;0;0;-;-\r");
    assert.ok(r);
    assert.equal(r.twHistory, "-");
  });

  it("preserves a newline inside a field verbatim", () => {
    const r = parseWordRecord("ca\nt;кошка;0;0;-;-");
    assert.ok(r);
    assert.equal(r.word, "ca\nt");
  });

  it("degrades safely when a ';' inside the word shifts fields", () => {
    const r = parseWordRecord("wo;rd;кошка;0;0;-;-");
    assert.ok(r);
    assert.equal(r.word, "wo");
    assert.equal(r.translation, "rd");
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
    assert.equal(r.wtHistory, "0");
    assert.equal(r.twHistory, "-");
  });

  it("parses a non-numeric count as 0", () => {
    const r = parseWordRecord("cat;кошка;abc;def;-;-");
    assert.ok(r);
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
  });

  it("parses a negative count as-is", () => {
    const r = parseWordRecord("cat;кошка;-3;-7;+-;--");
    assert.ok(r);
    assert.equal(r.wCount, -3);
    assert.equal(r.tCount, -7);
  });

  it("ignores extra fields beyond six", () => {
    const r = parseWordRecord("cat;кошка;3;7;+-;--;EXTRA;MORE");
    assert.ok(r);
    assert.deepEqual(stats(r), {
      word: "cat",
      translation: "кошка",
      wCount: 3,
      tCount: 7,
      wtHistory: "+-",
      twHistory: "--",
    });
  });

  it("never throws on malformed input", () => {
    const lines = [
      "",
      ";",
      ";;;",
      "a;",
      ";b",
      "a;b;c;d;e;f;g;h",
      "\r",
      "\n",
      "a;b;c;d;e;f;g;h;i;j",
    ];
    for (const line of lines) {
      assert.doesNotThrow(() => parseWordRecord(line));
    }
  });
});

describe("packWordRecord", () => {
  it("packs to the exact 6-field line with one trailing newline", () => {
    const line = packWordRecord(
      rec({ wCount: 3, tCount: 7, wtHistory: "+-+--", twHistory: "--+--" }),
    );
    assert.equal(line, "cat;кошка;3;7;+-+--;--+--\n");
  });

  it("packs counts in decimal", () => {
    const line = packWordRecord(rec({ wCount: 16, tCount: 255 }));
    assert.equal(line, "cat;кошка;16;255;-;-\n");
  });

  it("packs a negative count verbatim", () => {
    const line = packWordRecord(rec({ wCount: -3 }));
    assert.equal(line, "cat;кошка;-3;0;-;-\n");
  });

  it("round-trips through pack and parse", () => {
    const r = rec({
      wCount: 3,
      tCount: 7,
      wtHistory: "+-+--",
      twHistory: "--+--",
      dirW2T: false,
    });
    const packed = packWordRecord(r);
    assert.ok(packed.endsWith("\n"));
    const back = parseWordRecord(packed.slice(0, -1));
    assert.ok(back);
    assert.deepEqual(stats(back), stats(r));
  });
});

describe("recordAnswer", () => {
  it("records a right w2t answer", () => {
    const r = rec({ dirW2T: true, wCount: 2, wtHistory: "+-" });
    recordAnswer(r, true);
    assert.equal(r.wCount, 3);
    assert.equal(r.wtHistory, "+-+");
    assert.equal(r.tCount, 0);
    assert.equal(r.twHistory, "-");
  });

  it("records a wrong w2t answer: count still increments, '-' appended", () => {
    const r = rec({ dirW2T: true, wCount: 2, wtHistory: "+-" });
    recordAnswer(r, false);
    assert.equal(r.wCount, 3);
    assert.equal(r.wtHistory, "+--");
  });

  it("records a right t2w answer", () => {
    const r = rec({ dirW2T: false, tCount: 5, twHistory: "--" });
    recordAnswer(r, true);
    assert.equal(r.tCount, 6);
    assert.equal(r.twHistory, "--+");
    assert.equal(r.wCount, 0);
    assert.equal(r.wtHistory, "-");
  });

  it("records a wrong t2w answer", () => {
    const r = rec({ dirW2T: false, tCount: 5, twHistory: "--" });
    recordAnswer(r, false);
    assert.equal(r.tCount, 6);
    assert.equal(r.twHistory, "---");
  });

  it("trims the history to its last 5 characters once it exceeds 5", () => {
    const r = rec({ dirW2T: true, wtHistory: "+-+-+" });
    recordAnswer(r, true);
    assert.equal(r.wtHistory, "-+-++");
  });

  it("keeps a history of exactly 5 characters", () => {
    const r = rec({ dirW2T: true, wtHistory: "+-+-" });
    recordAnswer(r, true);
    assert.equal(r.wtHistory, "+-+-+");
  });

  it("trims twHistory to its last 5 for t2w answers", () => {
    const r = rec({ dirW2T: false, twHistory: "+----" });
    recordAnswer(r, false);
    assert.equal(r.twHistory, "-----");
  });
});

describe("progress", () => {
  it("getWtProgress counts '+' times 20", () => {
    assert.equal(getWtProgress(rec({ wtHistory: "+-+-" })), 40);
    assert.equal(getWtProgress(rec({ wtHistory: "-" })), 0);
    assert.equal(getWtProgress(rec({ wtHistory: "" })), 0);
  });

  it("getTwProgress counts '+' times 20", () => {
    assert.equal(getTwProgress(rec({ twHistory: "++-" })), 40);
  });

  it("caps progress at 100 for damaged histories longer than 5", () => {
    assert.equal(getWtProgress(rec({ wtHistory: "++++++" })), 100);
    assert.equal(getWtProgress(rec({ wtHistory: "++--++" })), 80);
  });

  it("getProgress picks per dirW2T", () => {
    const w2t = rec({ dirW2T: true, wtHistory: "++", twHistory: "+++" });
    assert.equal(getProgress(w2t), 40);
    const t2w = rec({ dirW2T: false, wtHistory: "++", twHistory: "+++" });
    assert.equal(getProgress(t2w), 60);
  });
});

describe("isLearned", () => {
  it("is true when both progresses reach 100", () => {
    assert.equal(isLearned(rec({ wtHistory: "+++++", twHistory: "+++++" })), true);
  });

  it("is false below the 200 boundary", () => {
    assert.equal(isLearned(rec({ wtHistory: "+++++", twHistory: "++++" })), false);
  });

  it("counts damaged capped histories", () => {
    assert.equal(isLearned(rec({ wtHistory: "++++++", twHistory: "++++++" })), true);
  });
});

describe("setDirection", () => {
  it("flips a w2t request to t2w when wt ≥ 100 and tw < 100", () => {
    const r = rec({ wtHistory: "+++++", twHistory: "--" });
    assert.equal(setDirection(r, true), false);
  });

  it("flips a t2w request to w2t when tw ≥ 100 and wt < 100", () => {
    const r = rec({ wtHistory: "--", twHistory: "+++++" });
    assert.equal(setDirection(r, false), true);
  });

  it("honors the request when neither side is mastered", () => {
    const r = rec({ wtHistory: "+-", twHistory: "--" });
    assert.equal(setDirection(r, true), true);
    assert.equal(setDirection(r, false), false);
  });

  it("honors the request when both sides are mastered", () => {
    const r = rec({ wtHistory: "+++++", twHistory: "+++++" });
    assert.equal(setDirection(r, true), true);
    assert.equal(setDirection(r, false), false);
  });
});

describe("getWord/getAnswer", () => {
  it("return word/translation for w2t", () => {
    const r = rec({ dirW2T: true });
    assert.equal(getWord(r), "cat");
    assert.equal(getAnswer(r), "кошка");
  });

  it("return translation/word for t2w", () => {
    const r = rec({ dirW2T: false });
    assert.equal(getWord(r), "кошка");
    assert.equal(getAnswer(r), "cat");
  });
});

describe("clearStats", () => {
  it("zeroes counts and empties histories", () => {
    const r = rec({ wCount: 5, tCount: 3, wtHistory: "+++++", twHistory: "++-" });
    clearStats(r);
    assert.equal(r.wCount, 0);
    assert.equal(r.tCount, 0);
    assert.equal(r.wtHistory, "");
    assert.equal(r.twHistory, "");
  });
});

describe("isSameWord", () => {
  it("is exact case-sensitive word-text equality", () => {
    assert.equal(isSameWord(rec(), rec()), true);
    assert.equal(isSameWord(rec(), rec({ word: "Cat" })), false);
    assert.equal(isSameWord(rec(), rec({ word: "dog" })), false);
  });
});

describe("makeWordRecord", () => {
  it("builds a record from a valid pair", () => {
    const r = makeWordRecord("cat", "кошка");
    assert.ok(r);
    assert.equal(r.word, "cat");
    assert.equal(r.translation, "кошка");
  });

  it("rejects an empty word", () => {
    assert.equal(makeWordRecord("", "кошка"), null);
  });

  it("rejects an empty translation", () => {
    assert.equal(makeWordRecord("cat", ""), null);
  });

  it("rejects ';' in the word", () => {
    assert.equal(makeWordRecord("ca;t", "кошка"), null);
  });

  it("rejects ';' in the translation", () => {
    assert.equal(makeWordRecord("cat", "ко;шка"), null);
  });

  it("rejects a newline in the word", () => {
    assert.equal(makeWordRecord("ca\nt", "кошка"), null);
  });

  it("rejects a newline in the translation", () => {
    assert.equal(makeWordRecord("cat", "ко\nшка"), null);
  });
});
