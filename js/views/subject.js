import { getSubject } from '../data.js';
import { getChapterProgress, getWeakCardsCount } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';

export async function renderSubject(container, { subject: subjectId }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    el('h1', {}, subject.name)
  );

  // ── Progression for this subject ──
  let totalMastered = 0, totalCards = 0, totalWeak = 0;
  for (const chapter of subject.chapters) {
    const progress = getChapterProgress(subjectId, chapter.id, chapter.cardCount);
    totalMastered += progress.mastered;
    totalCards += progress.total;
    totalWeak += getWeakCardsCount(subjectId, chapter.id);
  }

  const progressSection = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Progression')
  );

  if (totalCards > 0) {
    const statsRow = el('div', { class: 'dashboard-stats-row' });
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate(`allcards?filter=mastered&subject=${subjectId}`)
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalMastered)),
      el('div', { class: 'dashboard-stat-label' }, 'Maîtrisées')
    ));
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate(`allcards?filter=weak&subject=${subjectId}`)
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalWeak)),
      el('div', { class: 'dashboard-stat-label' }, 'À revoir')
    ));
    statsRow.appendChild(el('div', {
      class: 'dashboard-stat clickable',
      onClick: () => navigate(`allcards?filter=all&subject=${subjectId}`)
    },
      el('div', { class: 'dashboard-stat-value' }, String(totalCards)),
      el('div', { class: 'dashboard-stat-label' }, 'Total')
    ));
    progressSection.appendChild(statsRow);
  } else {
    progressSection.appendChild(el('div', { class: 'placeholder', style: 'padding:20px' },
      el('p', {}, 'Pas encore commencé')
    ));
  }

  // Chapters
  const chaptersSection = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Chapitres')
  );

  for (const chapter of subject.chapters) {
    const glossaryBtn = el('button', {
      class: 'chapter-revise-btn glossary-btn',
      onClick: (e) => { e.stopPropagation(); navigate(`${subjectId}/glossary`); },
      'aria-label': 'Glossaire'
    }, icon('book-open', 16));

    const reviseBtn = el('button', {
      class: 'chapter-revise-btn',
      onClick: (e) => { e.stopPropagation(); navigate(`${subjectId}/${chapter.id}/flashcards`); },
      'aria-label': 'Réviser'
    }, icon('play', 16), ' Réviser');

    const card = el('div', { class: 'chapter-card', onClick: () => navigate(`${subjectId}/${chapter.id}`) },
      el('span', { class: 'icon' }, chapter.icon || '📄'),
      el('div', { class: 'info' },
        el('div', { class: 'name' }, chapter.name),
        el('div', { class: 'meta' }, `${chapter.cardCount} cartes`)
      ),
      el('div', { class: 'chapter-actions' }, glossaryBtn, reviseBtn)
    );
    chaptersSection.appendChild(card);
  }

  const view = el('div', { class: 'view' });
  view.append(topbar, progressSection, chaptersSection);
  container.appendChild(view);
}
