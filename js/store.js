const KEY = 'flashy';

const DEFAULTS = {
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

function load() {
  if (state) return;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : {};
    state = {
      prefs: { ...DEFAULTS.prefs, ...saved.prefs },
      cards: saved.cards || {},
      chapters: saved.chapters || {}
    };
  } catch {
    state = JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
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

export function saveCardAnswer(cardId, correct) {
  load();
  const existing = state.cards[cardId] || { score: 0, fav: false };
  existing.score += correct ? 1 : -1;
  existing.last = Date.now();
  state.cards[cardId] = existing;
  save();
}

export function toggleFavorite(cardId) {
  load();
  const existing = state.cards[cardId] || { score: 0, fav: false };
  existing.fav = !existing.fav;
  state.cards[cardId] = existing;
  save();
  return existing.fav;
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
    reviewed,
    mastered,
    total: totalCards,
    percent: totalCards ? Math.round(mastered / totalCards * 100) : 0
  };
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
