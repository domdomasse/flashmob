import { getPrefs, setPref } from '../store.js';
import { el } from '../render.js';
import { navigate } from '../router.js';

const FONT_SIZES = [
  { value: 0.85, label: 'Petit' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grand' },
  { value: 1.3, label: 'Très grand' }
];

export async function renderSettings(container) {
  const prefs = getPrefs();

  const topbar = el('div', { class: 'topbar' },
    el('button', { class: 'btn-back', onClick: () => navigate(''), 'aria-label': 'Retour' }, '←'),
    el('h1', {}, '⚙️ Réglages')
  );

  // ── Theme toggle ──
  const themeInput = document.createElement('input');
  themeInput.type = 'checkbox';
  themeInput.checked = prefs.theme === 'light';
  themeInput.addEventListener('change', () => {
    setPref('theme', themeInput.checked ? 'light' : 'dark');
    window.__applyPrefs();
  });

  const themeRow = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, 'Mode clair'),
      el('div', { class: 'sublabel' }, "Changer l'apparence du site")
    ),
    el('label', { class: 'toggle' }, themeInput, el('span', { class: 'slider' }))
  );

  // ── Font size ──
  let fontIdx = FONT_SIZES.findIndex(f => f.value === prefs.fontSize);
  if (fontIdx === -1) fontIdx = 1;
  const fontLabel = el('span', { class: 'value' }, FONT_SIZES[fontIdx].label);

  const updateFont = (delta) => {
    fontIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, fontIdx + delta));
    fontLabel.textContent = FONT_SIZES[fontIdx].label;
    setPref('fontSize', FONT_SIZES[fontIdx].value);
    window.__applyPrefs();
  };

  const fontRow = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, 'Taille du texte'),
      el('div', { class: 'sublabel' }, "Ajuster la taille de l'affichage")
    ),
    el('div', { class: 'font-size-control' },
      el('button', { onClick: () => updateFont(-1), 'aria-label': 'Réduire' }, 'A-'),
      fontLabel,
      el('button', { onClick: () => updateFont(1), 'aria-label': 'Agrandir' }, 'A+')
    )
  );

  // ── Spaced repetition toggle ──
  const spacedInput = document.createElement('input');
  spacedInput.type = 'checkbox';
  spacedInput.checked = prefs.spacedRepetition;
  spacedInput.addEventListener('change', () => setPref('spacedRepetition', spacedInput.checked));

  const spacedRow = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, 'Répétition espacée'),
      el('div', { class: 'sublabel' }, 'Les cartes ratées reviennent plus souvent')
    ),
    el('label', { class: 'toggle' }, spacedInput, el('span', { class: 'slider' }))
  );

  // ── Timer toggle ──
  const timerInput = document.createElement('input');
  timerInput.type = 'checkbox';
  timerInput.checked = prefs.timer;
  timerInput.addEventListener('change', () => setPref('timer', timerInput.checked));

  const timerRow = el('div', { class: 'toggle-row' },
    el('div', {},
      el('div', { class: 'label' }, "Chronomètre d'examen"),
      el('div', { class: 'sublabel' }, 'Afficher un chrono sur les exercices type bac')
    ),
    el('label', { class: 'toggle' }, timerInput, el('span', { class: 'slider' }))
  );

  // ── Assemble ──
  const appearance = el('div', { class: 'section' },
    el('div', { class: 'section-title' }, 'Apparence'),
    themeRow,
    fontRow
  );

  const features = el('div', { class: 'section', style: 'margin-top: 24px' },
    el('div', { class: 'section-title' }, 'Fonctionnalités'),
    spacedRow,
    timerRow
  );

  const view = el('div', { class: 'view' });
  view.append(topbar, appearance, features);
  container.appendChild(view);
}
