import { getSubject } from '../data.js';
import { el } from '../render.js';
import { navigate } from '../router.js';
import { renderFlashcardsTab } from './flashcards.js';

const TABS = [
  { id: 'summary', label: 'Résumé', icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'exercises', label: 'Exercices', icon: '✏️' },
  { id: 'resources', label: 'Ressources', icon: '🔗' }
];

export async function renderChapter(container, { subject: subjectId, chapter: chapterId, tab }) {
  const subject = await getSubject(subjectId);
  if (!subject) { navigate(''); return; }
  const chapter = subject.chapters.find(c => c.id === chapterId);
  if (!chapter) { navigate(subjectId); return; }

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(subjectId), 'aria-label': 'Retour' }, '←'),
    el('h1', {}, chapter.name)
  );

  // Tab bar
  const tabBar = el('div', { class: 'tab-bar' });
  for (const t of TABS) {
    tabBar.appendChild(
      el('button', {
        class: t.id === tab ? 'active' : '',
        onClick: () => navigate(`${subjectId}/${chapterId}/${t.id}`)
      }, `${t.icon} ${t.label}`)
    );
  }

  // Tab content
  const content = el('div', { class: 'tab-content' });

  const view = el('div', { class: 'view' });
  view.append(topbar, tabBar, content);
  container.appendChild(view);

  // Render active tab
  if (tab === 'flashcards') {
    await renderFlashcardsTab(content, subjectId, chapterId);
  } else {
    const placeholders = {
      summary:   { icon: '📝', text: 'Le résumé du cours arrive bientôt.' },
      exercises: { icon: '✏️', text: 'Les exercices type bac arrivent bientôt.' },
      resources: { icon: '🔗', text: 'Les ressources arrivent bientôt.' }
    };
    const ph = placeholders[tab] || placeholders.summary;
    content.appendChild(
      el('div', { class: 'placeholder' },
        el('div', { class: 'icon' }, ph.icon),
        el('p', {}, ph.text)
      )
    );
  }
}
