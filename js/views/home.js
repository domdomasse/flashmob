import { getCatalog } from '../data.js';
import { getChapterProgress } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';

export async function renderHome(container) {
  const catalog = await getCatalog();

  // Topbar
  const topbar = el('div', { class: 'topbar' },
    el('h1', {}, '⚡ Flashy Flash'),
    el('button', { class: 'btn-icon', onClick: () => navigate('settings'), 'aria-label': 'Réglages' }, '⚙️')
  );

  // Dashboard
  let totalMastered = 0, totalCards = 0;
  for (const subject of catalog.subjects) {
    for (const chapter of subject.chapters) {
      const progress = getChapterProgress(subject.id, chapter.id, chapter.cardCount);
      totalMastered += progress.mastered;
      totalCards += progress.total;
    }
  }
  const globalPct = totalCards > 0 ? Math.round(totalMastered / totalCards * 100) : 0;

  const dashboard = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Progression'),
    el('div', { class: 'dashboard-card' },
      el('div', { class: 'title' }, 'Maîtrise globale'),
      el('div', { class: 'value' }, totalCards > 0 ? `${globalPct}%` : 'Pas encore commencé'),
      el('div', { class: 'progress-bar' },
        el('div', { class: 'fill', style: `width: ${globalPct}%` })
      )
    )
  );

  // Subjects grid
  const grid = el('div', { class: 'subject-grid' });
  for (const subject of catalog.subjects) {
    const count = subject.chapters.length;
    grid.appendChild(
      el('div', { class: 'subject-card', onClick: () => navigate(subject.id) },
        el('span', { class: 'icon' }, subject.icon),
        el('span', { class: 'name' }, subject.name),
        el('span', { class: 'meta' }, `${count} chapitre${count > 1 ? 's' : ''}`)
      )
    );
  }

  const subjects = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Matières'),
    grid
  );

  const view = el('div', { class: 'view' });
  view.append(topbar, dashboard, subjects);
  container.appendChild(view);
}
