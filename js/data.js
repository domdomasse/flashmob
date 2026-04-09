let catalog = null;
const cache = {};

export async function getCatalog() {
  if (!catalog) {
    const res = await fetch('data/index.json');
    catalog = await res.json();
  }
  return catalog;
}

export async function getSubject(subjectId) {
  const cat = await getCatalog();
  return cat.subjects.find(s => s.id === subjectId) || null;
}

export async function getChapterData(subjectId, chapterId, type) {
  const key = `${subjectId}/${chapterId}/${type}`;
  if (!cache[key]) {
    const res = await fetch(`data/${subjectId}/${chapterId}/${type}.json`);
    if (!res.ok) return null;
    cache[key] = await res.json();
  }
  return cache[key];
}
