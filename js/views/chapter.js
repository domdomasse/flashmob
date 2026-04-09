import { getSubject } from '../data.js';
import { el, showToast } from '../render.js';
import { navigate } from '../router.js';
import { icon } from '../icons.js';
import { renderFlashcardsTab } from './flashcards.js';
import { renderSummaryTab } from './summary.js';
import { renderExercisesTab } from './exercises.js';
import { renderCoursTab } from './cours.js';

const TABS = [
  { id: 'cours', label: 'Cours', iconName: 'book-open' },
  { id: 'summary', label: 'Résumé', iconName: 'file-text' },
  { id: 'flashcards', label: 'Flashcards', iconName: 'layers' },
  { id: 'exercises', label: 'Exercices', iconName: 'pencil' }
];

const TAB_RENDERERS = {
  cours: renderCoursTab,
  summary: renderSummaryTab,
  flashcards: renderFlashcardsTab,
  exercises: renderExercisesTab
};

export async function renderChapter(container, { subject: subjectId, chapter: chapterId, tab }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }
  const chapter = subject.chapters.find(c => c.id === chapterId);
  if (!chapter) { navigate(subjectId); return; }

  async function shareChapter() {
    const url = window.location.href;
    const title = `${chapter.name} — Flashy Flash`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); showToast('Lien copié !'); }
      catch { showToast('Impossible de copier le lien'); }
    }
  }

  const topbarTitle = el('h1', {}, chapter.name);
  const topbarSection = el('div', { class: 'topbar-section' });
  const topbarCenter = el('div', { class: 'topbar-center' }, topbarTitle, topbarSection);

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(subjectId), 'aria-label': 'Retour' }, icon('arrow-left', 20)),
    topbarCenter,
    el('button', { class: 'btn-icon', onClick: shareChapter, 'aria-label': 'Partager' }, icon('share-2', 20))
  );

  // Tab bar
  const tabBar = el('div', { class: 'tab-bar' });
  for (const t of TABS) {
    const btn = el('button', {
      class: t.id === tab ? 'active' : '',
      onClick: () => navigate(`${subjectId}/${chapterId}/${t.id}`)
    }, icon(t.iconName, 16), ' ' + t.label);
    tabBar.appendChild(btn);
  }

  // Slot for flashcard filters (between tab bar and content)
  const filterSlot = el('div', { class: 'tab-filter-slot' });
  const content = el('div', { class: 'tab-content' });

  const view = el('div', { class: 'view' });
  view.append(topbar, tabBar, filterSlot, content);
  container.appendChild(view);

  // Render active tab
  const renderer = TAB_RENDERERS[tab];
  if (renderer) {
    await renderer(content, subjectId, chapterId, { filterSlot });
  } else {
    content.appendChild(
      el('div', { class: 'placeholder' },
        el('div', { class: 'icon' }, '📄'),
        el('p', {}, 'Contenu non disponible.')
      )
    );
  }
}
