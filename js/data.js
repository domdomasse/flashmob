let catalog = null;
const MAX_CACHE = 20;
const cache = new Map();

export async function getCatalog() {
  if (!catalog) {
    try {
      const res = await fetch('data/index.json');
      if (!res.ok) return { subjects: [] };
      catalog = await res.json();
    } catch {
      return { subjects: [] };
    }
  }
  return catalog;
}

export async function getSubject(subjectId) {
  const cat = await getCatalog();
  return cat.subjects.find(s => s.id === subjectId) || null;
}

export async function getChapterData(subjectId, chapterId, type) {
  const key = `${subjectId}/${chapterId}/${type}`;
  if (cache.has(key)) {
    // Move to end (most recently used)
    const val = cache.get(key);
    cache.delete(key);
    cache.set(key, val);
    return val;
  }
  try {
    const res = await fetch(`data/${subjectId}/${chapterId}/${type}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(key, data);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return data;
  } catch {
    return null;
  }
}

/**
 * Load cards for a chapter, with caching.
 * Returns { categories: [...], cards: [...] } or null.
 */
export async function getChapterCards(subjectId, chapterId) {
  return getChapterData(subjectId, chapterId, 'cards');
}

/**
 * Load cards for all chapters in the given subjects.
 * Returns flat array of { card, cardId, subject, chapter, catLabel }.
 */
export async function getAllCards(subjects) {
  const allItems = [];
  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      const data = await getChapterCards(subject.id, chapter.id);
      if (!data) continue;
      const catMap = {};
      for (const cat of data.categories) catMap[cat.id] = cat.label;
      for (const card of data.cards) {
        allItems.push({
          card,
          cardId: `${subject.id}/${chapter.id}/${card.id}`,
          subject, chapter,
          catLabel: catMap[card.cat] || card.cat
        });
      }
    }
  }
  return allItems;
}
