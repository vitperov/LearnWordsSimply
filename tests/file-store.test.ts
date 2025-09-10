/// <reference types="node" />
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { InMemoryFileStore } from "../src/core/file-store.ts";

describe("InMemoryFileStore", () => {
  it("returns the written text for a written name", async () => {
    const store = new InMemoryFileStore();
    await store.writeFile("user.dic", "cat;кошка;0;0;-;-\n");
    assert.equal(await store.readFile("user.dic"), "cat;кошка;0;0;-;-\n");
  });

  it("resolves to null (not a rejection) for a name never written", async () => {
    const store = new InMemoryFileStore();
    assert.equal(await store.readFile("repeat.dic"), null);
  });

  it("returns promises from both readFile and writeFile", () => {
    const store = new InMemoryFileStore();
    assert.ok(store.readFile("user.dic") instanceof Promise);
    assert.ok(store.writeFile("user.dic", "text") instanceof Promise);
  });

  it("resolves writeFile to void", async () => {
    const store = new InMemoryFileStore();
    assert.equal(await store.writeFile("user.dic", "text"), undefined);
  });

  it("keeps the two dictionary names independent", async () => {
    const store = new InMemoryFileStore();
    await store.writeFile("user.dic", "main\n");
    assert.equal(await store.readFile("repeat.dic"), null);
    await store.writeFile("repeat.dic", "repeat\n");
    assert.equal(await store.readFile("user.dic"), "main\n");
    assert.equal(await store.readFile("repeat.dic"), "repeat\n");
  });

  it("overwrites a name with the latest write", async () => {
    const store = new InMemoryFileStore();
    await store.writeFile("user.dic", "first\n");
    await store.writeFile("user.dic", "second\n");
    assert.equal(await store.readFile("user.dic"), "second\n");
  });

  it("keeps state per instance", async () => {
    const a = new InMemoryFileStore();
    const b = new InMemoryFileStore();
    await a.writeFile("user.dic", "a\n");
    assert.equal(await b.readFile("user.dic"), null);
  });

  it("round-trips multi-line UTF-8 text verbatim", async () => {
    const store = new InMemoryFileStore();
    const blob = "cat;кошка;1;2;+-;--\ndog;собака\n";
    await store.writeFile("repeat.dic", blob);
    assert.equal(await store.readFile("repeat.dic"), blob);
  });
});
