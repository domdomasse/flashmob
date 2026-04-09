import { getSubject } from '../data.js';
import { getChapterProgress, getChapterStats } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';

export async function renderSubject(container, { subject: subjectId }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, '←'),
    el('h1', {}, `${subject.icon} ${subject.name}`)
  );

  const chaptersSection = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Chapitres')
  );

  for (const chapter of subject.chapters) {
    const progress = getChapterProgress(subjectId, chapter.id, chapter.cardCount);
    const stats = getChapterStats(subjectId, chapter.id);

    let metaText = `${chapter.cardCount} cartes`;
    if (progress.percent > 0) metaText += ` · ${progress.percent}% maîtrisé`;
    if (stats?.lastVisit) {
      const days = Math.floor((Date.now() - stats.lastVisit) / 86400000);
      if (days === 0) metaText += " · aujourd'hui";
      else if (days === 1) metaText += ' · hier';
      else metaText += ` · il y a ${days}j`;
    }
    if (chapter.estimatedTime) {
      metaText += ` · ~${chapter.estimatedTime.flashcards} min`;
    }

    const card = el('div', { class: 'chapter-card', onClick: () => navigate(`${subjectId}/${chapter.id}`) },
      el('span', { class: 'icon' }, chapter.icon || '📄'),
      el('div', { class: 'info' },
        el('div', { class: 'name' }, chapter.name),
        el('div', { class: 'meta' }, metaText),
        progress.percent > 0
          ? el('div', { class: 'progress-bar' }, el('div', { class: 'fill', style: `width: ${progress.percent}%` }))
          : false
      )
    );
    chaptersSection.appendChild(card);
  }

  const view = el('div', { class: 'view' });
  view.append(topbar, chaptersSection);
  container.appendChild(view);
}
