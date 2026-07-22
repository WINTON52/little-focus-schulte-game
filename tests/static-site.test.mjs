import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const siteFile = new URL("../index.html", import.meta.url);

test("child home has a daily rescue mission and a protected parent entrance", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /今天的救援任务/);
  assert.match(page, /给大人看/);
  assert.match(page, /data-screen="parent-dashboard"/);
  assert.match(page, /2000/);
});

test("the child path separates daily practice from super challenges", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /超能挑战/);
  assert.match(page, /3×3/);
  assert.match(page, /10×10/);
  assert.doesNotMatch(page, /最快用时|排行榜/);
});

test("the page loads its training rules as an ES module", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /<script type="module">/);
  assert.match(page, /from "\.\/game-model\.js"/);
});

test("rescue art stays on the outer edge and number tiles have no target styling", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /assets\/rescue-hq-background\.png/);
  assert.match(page, /assets\/rescue-complete-banner\.png/);
  assert.match(page, /class="rescue-home-art"/);
  assert.match(page, /data-focus-mode="quiet"/);
  assert.doesNotMatch(page, /\.tile\.target|classList\.add\(["']target/);
});

test("the iPad layout uses touch-sized controls and scalable board sizing", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /min-height:\s*44px/);
  assert.match(page, /clamp\(/);
  assert.match(page, /touch-action:\s*manipulation/);
  assert.match(page, /repeat\(var\(--columns\)/);
});

test("training interaction keeps pauses and mistakes gentle", async () => {
  const page = await readFile(siteFile, "utf8");

  assert.match(page, /function startTraining/);
  assert.match(page, /function handleTileTap/);
  assert.match(page, /state\.paused/);
  assert.match(page, /1200/);
  assert.match(page, /先吸一口气，再找/);
  assert.match(page, /speechSynthesis/);
  assert.doesNotMatch(page, /wrong.*shake|shake.*wrong/i);
});
