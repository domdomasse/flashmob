const KEY = 'flashmob';
const STORE_VERSION = 1;

const DEFAULTS = {
  version: STORE_VERSION,
  prefs: {
    theme: 'dark',
    fontSize: 1,
    spacedRepetition: false,
    timer: false
  },
  cards: {},
  chapters: {}
};

let state = null;

/**
 * Migrate saved data from older versions to the current schema.
 * Add migration steps here when STORE_VERSION is incremented.
 */
function migrate(saved) {
  const v = saved.version || 0;
  // v0 → v1: add version field (no data changes needed)
  if (v < 1) {
    saved.version = 1;
  }
  // Future migrations:
  // if (v < 2) { ... }
  return saved;
}

function load() {
  if (state) return;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : {};
    const migrated = migrate(saved);
    state = {
      version: STORE_VERSION,
      prefs: { ...DEFAULTS.prefs, ...migrated.prefs },
      cards: migrated.cards || {},
      chapters: migrated.chapters || {}
    };
    // Persist migration if version changed
    if (migrated.version !== (saved.version || 0)) save();
  } catch (e) {
    console.warn('Flashmob: données localStorage corrompues, reset aux valeurs par défaut.', e);
    state = JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Flashmob: impossible de sauvegarder (stockage plein ?).', e);
  }
}

// ── Preferences ──

export function getPrefs() {
  load();
  return { ...state.prefs };
}

export function setPref(key, value) {
  load();
  state.prefs[key] = value;
  save();
}

// ── Card progress ──

export function getCardProgress(cardId) {
  load();
  return state.cards[cardId] || null;
}

export function saveCardAnswer(cardId, correct, spacedData) {
  load();
  const existing = state.cards[cardId] || { score: 0, fav: false, level: 0 };
  existing.score += correct ? 1 : -1;
  existing.last = Date.now();
  if (spacedData) {
    existing.level = spacedData.level;
    existing.next = spacedData.next;
  }
  state.cards[cardId] = existing;
  save();
}

export function toggleFavorite(cardId) {
  load();
  const existing = state.cards[cardId] || { score: 0, fav: false, level: 0 };
  existing.fav = !existing.fav;
  state.cards[cardId] = existing;
  save();
  return existing.fav;
}

export function toggleBanned(cardId) {
  load();
  const existing = state.cards[cardId] || { score: 0, fav: false, level: 0 };
  existing.banned = !existing.banned;
  state.cards[cardId] = existing;
  save();
  return existing.banned;
}

export function isCardBanned(cardId) {
  load();
  const card = state.cards[cardId];
  return card ? !!card.banned : false;
}

// ── Chapter stats ──

export function getChapterStats(subjectId, chapterId) {
  load();
  return state.chapters[`${subjectId}/${chapterId}`] || null;
}

export function updateChapterVisit(subjectId, chapterId) {
  load();
  const key = `${subjectId}/${chapterId}`;
  const existing = state.chapters[key] || { sessionsCount: 0 };
  existing.lastVisit = Date.now();
  existing.sessionsCount++;
  state.chapters[key] = existing;
  save();
}

// ── Progress aggregation ──

export function getChapterProgress(subjectId, chapterId, totalCards) {
  load();
  const prefix = `${subjectId}/${chapterId}/`;
  let reviewed = 0, mastered = 0;
  for (const [key, data] of Object.entries(state.cards)) {
    if (key.startsWith(prefix)) {
      reviewed++;
      if (data.score >= 2) mastered++;
    }
  }
  return {
    reviewed, mastered, total: totalCards,
    percent: totalCards ? Math.round(mastered / totalCards * 100) : 0
  };
}

export function getWeakCardsCount(subjectId, chapterId) {
  load();
  const prefix = `${subjectId}/${chapterId}/`;
  let count = 0;
  for (const [key, data] of Object.entries(state.cards)) {
    if (key.startsWith(prefix) && data.score <= 0) count++;
  }
  return count;
}

export function getFavoritesCount(subjectId, chapterId) {
  load();
  const prefix = `${subjectId}/${chapterId}/`;
  let count = 0;
  for (const [key, data] of Object.entries(state.cards)) {
    if (key.startsWith(prefix) && data.fav) count++;
  }
  return count;
}

// ── Reset ──

export function resetChapter(subjectId, chapterId) {
  load();
  const prefix = `${subjectId}/${chapterId}/`;
  for (const key of Object.keys(state.cards)) {
    if (key.startsWith(prefix)) delete state.cards[key];
  }
  delete state.chapters[`${subjectId}/${chapterId}`];
  save();
}

export function resetAll() {
  state = JSON.parse(JSON.stringify(DEFAULTS));
  save();
}

// ── Export / Import ──

export function exportData() {
  load();
  return JSON.stringify(state, null, 2);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const migrated = migrate(data);
    state = {
      version: STORE_VERSION,
      prefs: { ...DEFAULTS.prefs, ...migrated.prefs },
      cards: migrated.cards || {},
      chapters: migrated.chapters || {}
    };
    save();
    return true;
  } catch {
    return false;
  }
}
