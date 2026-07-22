import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const siteFile = new URL("../index.html", import.meta.url);

test("static game keeps the complete 3x3 to 10x10 progression", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /const MIN_LEVEL = 3;/);
  assert.match(page, /const MAX_LEVEL = 10;/);
  assert.match(page, /little-focus-unlocked/);
  assert.match(page, /localStorage\.setItem\(UNLOCKED_KEY/);
  assert.match(page, /startGame\(state\.size \+ 1\)/);
});

test("the answer has no special orange target cue", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /tile\.className = `tile\$\{value < state\.next \? " done" : ""\}`/);
  assert.doesNotMatch(page, /tile\.target/);
  assert.doesNotMatch(page, /classList\.add\("target"\)/);
});

test("the page includes iPad-friendly board sizing", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /@media \(min-width: 768px\)/);
  assert.match(page, /width: min\(72vw, 560px\)/);
  assert.match(page, /touch-action: manipulation/);
});

test("rescue theme uses real edge artwork while leaving number tiles plain", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /assets\/rescue-hq-background\.png/);
  assert.match(page, /assets\/rescue-complete-banner\.png/);
  assert.match(page, /class="rescue-home-art"/);
  assert.match(page, /\.rescue-home-art \{ position: fixed; z-index: 0;/);
  assert.match(page, /\.app \{ position: relative; z-index: 1;/);
  assert.doesNotMatch(page, /<div class="mascot"[^>]*>☀️<\/div>/);
  assert.doesNotMatch(page, /<div class="mascot"[^>]*>🏆<\/div>/);
  assert.doesNotMatch(page, /tile\.rescue/);
});
