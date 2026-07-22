export const TRAINING_STORAGE_KEY = "little-focus-training-v2";
export const MIN_LEVEL = 3;
export const MAX_LEVEL = 10;
export const DAILY_MAX_LEVEL = 5;
const RECORD_LIMIT = 60;

function clampLevel(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, parsed));
}

function blankProfile(unlockedLevel = MIN_LEVEL) {
  return {
    version: 2,
    unlockedLevel: clampLevel(unlockedLevel),
    voiceEnabled: false,
    trainingRecords: [],
    dailyMissionDate: "",
    dailyMissionCompleted: false,
  };
}

function storageValue(storage, key) {
  if (!storage) return undefined;
  if (typeof storage.getItem === "function") return storage.getItem(key);
  return storage[key];
}

function normalizeRecord(value) {
  const size = clampLevel(value?.size);
  const wrongTaps = Math.max(0, Number(value?.wrongTaps) || 0);
  const durationMs = Math.max(0, Number(value?.durationMs) || 0);
  const accuracy = Number.isFinite(value?.accuracy)
    ? Math.min(1, Math.max(0, Number(value.accuracy)))
    : accuracyFor(size * size, wrongTaps);

  return {
    date: typeof value?.date === "string" ? value.date : "",
    size,
    mode: ["forward", "reverse", "pause"].includes(value?.mode) ? value.mode : "forward",
    durationMs,
    wrongTaps,
    accuracy,
  };
}

function normalizeProfile(value, legacyUnlocked) {
  const profile = value && typeof value === "object" ? value : {};
  const records = Array.isArray(profile.trainingRecords)
    ? profile.trainingRecords.map(normalizeRecord).slice(-RECORD_LIMIT)
    : [];

  return {
    ...blankProfile(Math.max(clampLevel(profile.unlockedLevel), clampLevel(legacyUnlocked))),
    version: 2,
    voiceEnabled: Boolean(profile.voiceEnabled),
    trainingRecords: records,
    dailyMissionDate: typeof profile.dailyMissionDate === "string" ? profile.dailyMissionDate : "",
    dailyMissionCompleted: Boolean(profile.dailyMissionCompleted),
  };
}

export function accuracyFor(total, wrongTaps) {
  const correct = Math.max(0, Number(total) || 0);
  const wrong = Math.max(0, Number(wrongTaps) || 0);
  return correct + wrong === 0 ? 0 : correct / (correct + wrong);
}

export function migrateProfile(storage) {
  const stored = storageValue(storage, TRAINING_STORAGE_KEY);
  let parsed = stored;
  if (typeof stored === "string") {
    try { parsed = JSON.parse(stored); } catch { parsed = null; }
  }
  const legacyUnlocked = storageValue(storage, "little-focus-unlocked");
  return normalizeProfile(parsed, legacyUnlocked);
}

export function qualifiesForUnlock(records, size) {
  const recent = records.filter((record) => record.size === size).slice(-3);
  return recent.filter((record) => record.accuracy >= 0.9 && record.wrongTaps <= 2).length >= 2;
}

export function isLevelStable(profile, size) {
  return qualifiesForUnlock(profile.trainingRecords, size);
}

export function availableModes(profile, size) {
  const modes = ["forward"];
  if (size >= 4 && isLevelStable(profile, 4)) modes.push("reverse", "pause");
  return modes;
}

export function completeTraining(profile, record) {
  const current = normalizeProfile(profile);
  const completed = normalizeRecord(record);
  const trainingRecords = [...current.trainingRecords, completed].slice(-RECORD_LIMIT);
  const eligible = { ...current, trainingRecords };
  const unlockedLevel = completed.size === current.unlockedLevel && qualifiesForUnlock(trainingRecords, completed.size)
    ? Math.min(MAX_LEVEL, current.unlockedLevel + 1)
    : current.unlockedLevel;
  return { ...eligible, unlockedLevel };
}

export function selectDailyMission(profile, today) {
  const current = normalizeProfile(profile);
  const size = Math.min(DAILY_MAX_LEVEL, current.unlockedLevel);
  const modes = availableModes(current, size);

  if (size >= 4 && isLevelStable(current, size)) {
    const dayNumber = Number.parseInt(String(today).slice(-2), 10) || 0;
    return { size, mode: modes[(dayNumber % (modes.length - 1)) + 1] || "forward" };
  }
  return { size, mode: "forward" };
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

function daysBefore(now, days) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return dateKey(date);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function summarizeProgress(profile, now = new Date()) {
  const current = normalizeProfile(profile);
  const cutoff = daysBefore(now, 6);
  const recentSevenDays = current.trainingRecords.filter((record) => record.date >= cutoff);
  const latestThree = current.trainingRecords.slice(-3);

  return {
    completedLastSevenDays: recentSevenDays.length,
    recommendedLevel: Math.min(DAILY_MAX_LEVEL, current.unlockedLevel),
    recentThree: {
      records: latestThree,
      averageWrongTaps: average(latestThree.map((record) => record.wrongTaps)),
      averageDurationMs: average(latestThree.map((record) => record.durationMs)),
      averageAccuracy: average(latestThree.map((record) => record.accuracy)),
    },
  };
}
