import { initRouter } from './router.js';
import { getPrefs } from './store.js';
import { renderView, showToast } from './render.js';
import { renderHome } from './views/home.js';
import { renderSubject } from './views/subject.js';
import { renderChapter } from './views/chapter.js';
import { renderSettings } from './views/settings.js';
import { renderSearch } from './views/search.js';
import { renderAllCards } from './views/allcards.js';

const views = {
  home: renderHome,
  subject: renderSubject,
  chapter: renderChapter,
  settings: renderSettings,
  search: renderSearch,
  allcards: renderAllCards
};

function applyPrefs() {
  const prefs = getPrefs();
  document.documentElement.setAttribute('data-theme', prefs.theme);
  document.documentElement.style.setProperty('--font-scale', prefs.fontSize);
  const themeColors = { dark: '#0f172a', light: '#f1f5f9' };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColors[prefs.theme] || themeColors.dark);
}

window.__applyPrefs = applyPrefs;

function onNavigate(route) {
  const viewFn = views[route.view] || renderHome;
  renderView(viewFn, route.params);
}

applyPrefs();
initRouter(onNavigate);

// ── Offline/online indicator ──
window.addEventListener('offline', () => showToast('Mode hors-ligne'));
window.addEventListener('online', () => showToast('Connexion rétablie'));

// ── PWA install prompt ──
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  // Don't show if already installed or dismissed this session
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (sessionStorage.getItem('pwa-dismissed')) return;

  const banner = document.createElement('div');
  banner.className = 'pwa-banner';
  banner.innerHTML = `
    <span class="pwa-banner-text">Installer Flashmob</span>
    <button class="pwa-banner-install">Installer</button>
    <button class="pwa-banner-close" aria-label="Fermer">&times;</button>
  `;

  banner.querySelector('.pwa-banner-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') showToast('Flashmob installé !');
    deferredPrompt = null;
    banner.remove();
  });

  banner.querySelector('.pwa-banner-close').addEventListener('click', () => {
    sessionStorage.setItem('pwa-dismissed', '1');
    banner.remove();
  });

  document.body.appendChild(banner);
}
