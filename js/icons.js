// Lucide icon helper — creates <i data-lucide="name"> elements
// After rendering a view, call refreshIcons() to replace them with SVGs.
// Custom SVG icons are registered in CUSTOM_ICONS and rendered inline.

const CUSTOM_ICONS = {
  pagode: {
    viewBox: '0 0 24 24',
    strokeWidth: '1',
    svg: `<line x1="7" y1="22" x2="17" y2="22"/><line x1="10" y1="22" x2="10" y2="18"/><line x1="14" y1="22" x2="14" y2="18"/><path d="M5 18 L12 15 L19 18"/><line x1="9" y1="18" x2="9" y2="14.5"/><line x1="15" y1="18" x2="15" y2="14.5"/><path d="M6.5 14.5 L12 11.5 L17.5 14.5"/><line x1="10" y1="14.5" x2="10" y2="11"/><line x1="14" y1="14.5" x2="14" y2="11"/><path d="M8 11 L12 8 L16 11"/><line x1="12" y1="8" x2="12" y2="4"/><circle cx="12" cy="3.5" r="0.5" fill="currentColor" stroke="none"/>`
  },
  lanterne: {
    viewBox: '0 0 24 24',
    strokeWidth: '1',
    svg: `<line x1="12" y1="2" x2="12" y2="5"/><line x1="9" y1="5" x2="15" y2="5"/><path d="M9 5 C6 8, 6 14, 9 17"/><path d="M15 5 C18 8, 18 14, 15 17"/><path d="M9 11 Q12 12, 15 11"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="12" y1="17" x2="12" y2="19"/><line x1="10.5" y1="19" x2="13.5" y2="19"/><line x1="11" y1="19" x2="11" y2="22"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="13" y1="19" x2="13" y2="22"/>`
  },
  boussole: {
    viewBox: '0 0 24 24',
    strokeWidth: '1',
    svg: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7"/><path d="M12 5 L13.5 11 L12 10 L10.5 11 Z" fill="currentColor" stroke="none"/><path d="M12 19 L10.5 13 L12 14 L13.5 13 Z"/><line x1="12" y1="2.5" x2="12" y2="3.5"/><line x1="12" y1="20.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="3.5" y2="12"/><line x1="20.5" y1="12" x2="21.5" y2="12"/><line x1="4.2" y1="4.2" x2="4.9" y2="4.9"/><line x1="19.8" y1="4.2" x2="19.1" y2="4.9"/><line x1="4.2" y1="19.8" x2="4.9" y2="19.1"/><line x1="19.8" y1="19.8" x2="19.1" y2="19.1"/>`
  }
};

export function icon(name, size = 20) {
  if (CUSTOM_ICONS[name]) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', CUSTOM_ICONS[name].viewBox || '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', CUSTOM_ICONS[name].strokeWidth || '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = CUSTOM_ICONS[name].svg;
    return svg;
  }
  const i = document.createElement('i');
  i.setAttribute('data-lucide', name);
  i.style.width = size + 'px';
  i.style.height = size + 'px';
  return i;
}

export function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
