import assert from "node:assert/strict";
import test from "node:test";

import {
  accuracyFor,
  availableModes,
  completeTraining,
  migrateProfile,
  qualifiesForUnlock,
  selectDailyMission,
  summarizeProgress,
} from "../game-model.js";

const day = "2026-07-22";

function record(size, { accuracy = 1, wrongTaps = 0, date = day, mode = "forward", durationMs = 30000 } = {}) {
  return { date, size, mode, durationMs, wrongTaps, accuracy };
}

test("accuracy includes wrong taps without treating a retry as progress", () => {
  assert.equal(accuracyFor(9, 0), 1);
  assert.equal(accuracyFor(9, 1), 0.9);
  assert.equal(accuracyFor(9, 3), 0.75);
});

test("two qualifying attempts among the three most recent attempts unlock a level", () => {
  const records = [
    record(3, { accuracy: 1, wrongTaps: 0 }),
    record(3, { accuracy: 0.89, wrongTaps: 1 }),
    record(3, { accuracy: 0.9, wrongTaps: 2 }),
  ];

  assert.equal(qualifiesForUnlock(records, 3), true);
  assert.equal(qualifiesForUnlock([record(3), record(3, { wrongTaps: 3 }), record(3, { accuracy: 0.8 })], 3), false);
});

test("only the current highest unlocked level can advance one step", () => {
  const profile = migrateProfile({ "little-focus-unlocked": "4" });
  const afterTwo = [record(4), record(4)].reduce((current, next) => completeTraining(current, next), profile);
  const advanced = completeTraining(afterTwo, record(4));
  const replay = completeTraining(advanced, record(3));

  assert.equal(afterTwo.unlockedLevel, 4);
  assert.equal(advanced.unlockedLevel, 5);
  assert.equal(replay.unlockedLevel, 5);
});

test("legacy unlock progress migrates to a versioned profile and remains clamped", () => {
  assert.equal(migrateProfile({ "little-focus-unlocked": "6" }).unlockedLevel, 6);
  assert.equal(migrateProfile({ "little-focus-unlocked": "999" }).unlockedLevel, 10);
  assert.equal(migrateProfile({ "little-focus-unlocked": "bad" }).unlockedLevel, 3);
});

test("daily mission prioritizes the current daily-path level and reverse mode waits for stable 4x4", () => {
  const newProfile = migrateProfile({});
  assert.deepEqual(selectDailyMission(newProfile, day), { size: 3, mode: "forward" });
  assert.deepEqual(availableModes(newProfile, 4), ["forward"]);

  const stableFour = {
    ...newProfile,
    unlockedLevel: 5,
    trainingRecords: [record(4), record(4), record(4)],
  };
  assert.deepEqual(availableModes(stableFour, 4), ["forward", "reverse", "pause"]);
  assert.deepEqual(selectDailyMission(stableFour, day), { size: 5, mode: "forward" });
});

test("parent summary only uses the recent seven days and the latest three records", () => {
  const profile = {
    ...migrateProfile({}),
    unlockedLevel: 5,
    trainingRecords: [
      record(3, { date: "2026-07-14", wrongTaps: 9, durationMs: 99000 }),
      record(3, { date: "2026-07-16", wrongTaps: 3, durationMs: 60000 }),
      record(4, { date: "2026-07-20", wrongTaps: 2, durationMs: 50000 }),
      record(4, { date: "2026-07-21", wrongTaps: 1, durationMs: 40000 }),
      record(5, { date: day, wrongTaps: 0, durationMs: 30000 }),
    ],
  };

  const summary = summarizeProgress(profile, new Date("2026-07-22T12:00:00"));

  assert.equal(summary.completedLastSevenDays, 4);
  assert.equal(summary.recommendedLevel, 5);
  assert.equal(summary.recentThree.averageWrongTaps, 1);
  assert.equal(summary.recentThree.averageDurationMs, 40000);
});
