/* ── Flashmob Admin — Frontend ───────────────────── */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ── State ──────────────────────────────────────────

let images = [];       // [{file, data, type}]
let generated = {};    // {cours, summary, cards, glossary, exercises}

// ── API Key ────────────────────────────────────────

const apiKeyInput = $('#api-key');
const toggleKey = $('#toggle-key');

// Restaurer depuis sessionStorage
apiKeyInput.value = sessionStorage.getItem('fb-admin-key') || '';
apiKeyInput.addEventListener('input', () => {
  sessionStorage.setItem('fb-admin-key', apiKeyInput.value);
});
toggleKey.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// ── Sujets existants ───────────────────────────────

const subjectSelect = $('#subject-select');
const newSubjectFields = $('#new-subject-fields');

async function loadSubjects() {
  try {
    const res = await fetch('/api/subjects', { method: 'POST' });
    const data = await res.json();
    for (const s of data.subjects || []) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.id})`;
      opt.dataset.name = s.name;
      opt.dataset.icon = s.icon;
      opt.dataset.color = s.color;
      subjectSelect.appendChild(opt);
    }
  } catch (e) {
    console.error('Erreur chargement sujets:', e);
  }
}

subjectSelect.addEventListener('change', () => {
  newSubjectFields.classList.toggle('hidden', subjectSelect.value !== '');
});

loadSubjects();

// ── Auto-ID chapitre ───────────────────────────────

const chapterName = $('#chapter-name');
const chapterId = $('#chapter-id');

chapterName.addEventListener('input', () => {
  if (!chapterId.dataset.manual) {
    chapterId.value = slugify(chapterName.value);
  }
});
chapterId.addEventListener('input', () => {
  chapterId.dataset.manual = '1';
});

function slugify(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

// ── Upload images ──────────────────────────────────

const dropzone = $('#dropzone');
const fileInput = $('#file-input');
const thumbsEl = $('#thumbs');
const clearBtn = $('#clear-images');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});
const uploadActions = $('#upload-actions');
const btnAnalyze = $('#btn-analyze');
const analyzeStatus = $('#analyze-status');

clearBtn.addEventListener('click', () => {
  images = [];
  renderThumbs();
});

btnAnalyze.addEventListener('click', analyzeImages);

// ── PDF.js config ────────────────────────────────

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js';
}

async function addFiles(fileList) {
  for (const file of fileList) {
    if (file.type === 'application/pdf') {
      await addPdfPages(file);
    } else if (file.type.startsWith('image/')) {
      const resized = await resizeImage(file);
      images.push({ file, ...resized });
    }
  }
  renderThumbs();
}

async function addPdfPages(file) {
  if (typeof pdfjsLib === 'undefined') {
    showError('pdf.js non chargé — vérifie ta connexion internet.');
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // Rendre à 2x pour bonne qualité, max 1568px
    const baseViewport = page.getViewport({ scale: 1 });
    const maxDim = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.min(2, 1568 / maxDim);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Créer un faux File pour la miniature
    const blob = await (await fetch(dataUrl)).blob();
    const pageFile = new File([blob], `${file.name}_p${i}.jpg`, { type: 'image/jpeg' });

    images.push({
      file: pageFile,
      data: dataUrl.split(',')[1],
      type: 'image/jpeg'
    });
  }
}

function resizeImage(file, maxSize = 1568) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
      resolve({
        data: dataUrl.split(',')[1],
        type: 'image/jpeg'
      });
    };
    img.src = URL.createObjectURL(file);
  });
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
  uploadActions.classList.toggle('hidden', images.length === 0);

  images.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';

    const imgEl = document.createElement('img');
    imgEl.src = URL.createObjectURL(img.file);

    const btn = document.createElement('button');
    btn.className = 'thumb-remove';
    btn.textContent = '×';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      images.splice(i, 1);
      renderThumbs();
    });

    div.append(imgEl, btn);
    thumbsEl.appendChild(div);
  });
}

// ── Analyse automatique ────────────────────────────

async function analyzeImages() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return showError('Entre ta clé API Claude d\'abord.');
  if (images.length === 0) return;

  errorEl.classList.add('hidden');
  btnAnalyze.disabled = true;
  analyzeStatus.classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        config: {},
        step: 'analyze',
        images: images.map(i => ({ data: i.data, type: i.type })),
        courseText: ''
      })
    });

    const result = await res.json();

    if (!result.ok) throw new Error(result.error || 'Erreur inconnue');

    const info = result.result;
    fillConfig(info);

  } catch (e) {
    showError('Erreur d\'analyse : ' + e.message);
  }

  btnAnalyze.disabled = false;
  analyzeStatus.classList.add('hidden');
}

function fillConfig(info) {
  // Matière : sélectionner si elle existe déjà, sinon remplir les champs nouvelle matière
  const existingOption = [...subjectSelect.options].find(o => o.value === info.subjectId);

  if (existingOption) {
    subjectSelect.value = info.subjectId;
    newSubjectFields.classList.add('hidden');
  } else {
    subjectSelect.value = '';
    newSubjectFields.classList.remove('hidden');
    $('#subject-id').value = info.subjectId || '';
    $('#subject-name').value = info.subjectName || '';
    $('#subject-icon').value = info.subjectIcon || 'book';
    $('#subject-color').value = info.subjectColor || '#38bdf8';
  }

  // Chapitre
  chapterName.value = info.chapterName || '';
  chapterId.value = info.chapterId || '';
  chapterId.dataset.manual = '1';
  $('#chapter-icon').value = info.chapterIcon || 'file-text';

  // Indicateur visuel
  $('#auto-badge').classList.remove('hidden');

  // Scroll vers la config
  $('#step-config').scrollIntoView({ behavior: 'smooth' });
}

// ── Génération ─────────────────────────────────────

const btnGenerate = $('#btn-generate');
const progressEl = $('#progress');
const errorEl = $('#error');
const resultSection = $('#step-result');

const STEPS = ['cours', 'summary', 'cards', 'glossary', 'exercises'];
const STEP_LABELS = {
  cours: 'Cours',
  summary: 'Résumé',
  cards: 'Flashcards',
  glossary: 'Glossaire',
  exercises: 'Exercices'
};

btnGenerate.addEventListener('click', startGeneration);

async function startGeneration() {
  // Validation
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return showError('Entre ta clé API Claude.');
  if (images.length === 0) return showError('Ajoute au moins une photo.');
  if (!chapterName.value.trim()) return showError('Remplis le nom du chapitre.');

  const config = getConfig();
  if (!config.subject) return showError('Choisis ou crée une matière.');

  // Reset
  generated = {};
  errorEl.classList.add('hidden');
  resultSection.classList.add('hidden');
  progressEl.classList.remove('hidden');
  btnGenerate.disabled = true;

  $$('.progress-item').forEach(el => {
    el.className = 'progress-item';
  });

  let courseText = '';

  for (const step of STEPS) {
    const item = $(`.progress-item[data-step="${step}"]`);
    item.classList.add('active');

    try {
      const body = {
        apiKey,
        config,
        step,
        images: step === 'cours' ? images.map(i => ({ data: i.data, type: i.type })) : [],
        courseText
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (!result.ok) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      generated[step] = result.result;
      item.classList.remove('active');
      item.classList.add('done');

      // Après le cours, extraire le texte pour les étapes suivantes
      if (step === 'cours') {
        courseText = flattenCours(result.result);
      }

    } catch (e) {
      item.classList.remove('active');
      item.classList.add('error');
      showError(`Erreur à l'étape "${STEP_LABELS[step]}" : ${e.message}`);
      btnGenerate.disabled = false;
      return;
    }
  }

  btnGenerate.disabled = false;
  showResult();
}

function flattenCours(data) {
  const lines = [];
  for (const s of data.sections || []) {
    lines.push(`\n## ${s.title}\n`);
    if (s.content) lines.push(s.content);
    for (const sub of s.subsections || []) {
      lines.push(`\n### ${sub.title}\n`);
      if (sub.content) lines.push(sub.content);
    }
  }
  return lines.join('\n');
}

function getConfig() {
  const isNew = subjectSelect.value === '';
  return {
    subject: isNew ? $('#subject-id').value.trim() : subjectSelect.value,
    subjectName: isNew ? $('#subject-name').value.trim() : subjectSelect.selectedOptions[0]?.dataset.name || '',
    subjectIcon: isNew ? $('#subject-icon').value.trim() : subjectSelect.selectedOptions[0]?.dataset.icon || 'book',
    subjectColor: isNew ? $('#subject-color').value : subjectSelect.selectedOptions[0]?.dataset.color || '#38bdf8',
    chapterId: chapterId.value.trim() || slugify(chapterName.value),
    chapterName: chapterName.value.trim(),
    icon: $('#chapter-icon').value.trim() || 'file-text'
  };
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

// ── Résultat ───────────────────────────────────────

function showResult() {
  resultSection.classList.remove('hidden');

  // Stats
  const statsEl = $('#stats');
  const cardCount = generated.cards?.cards?.length || 0;
  const termCount = generated.glossary?.terms?.length || 0;
  const exCount = generated.exercises?.exercises?.length || 0;
  const sectionCount = generated.cours?.sections?.length || 0;

  statsEl.innerHTML = `
    <div class="stat"><strong>${cardCount}</strong>flashcards</div>
    <div class="stat"><strong>${termCount}</strong>termes</div>
    <div class="stat"><strong>${exCount}</strong>exercices</div>
    <div class="stat"><strong>${sectionCount}</strong>sections</div>
  `;

  // Tabs
  const tabsEl = $('#preview-tabs');
  const codeEl = $('#preview-code');
  tabsEl.innerHTML = '';

  let activeTab = 'cours';

  for (const step of STEPS) {
    const btn = document.createElement('button');
    btn.className = 'preview-tab' + (step === activeTab ? ' active' : '');
    btn.textContent = STEP_LABELS[step];
    btn.addEventListener('click', () => {
      $$('.preview-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      codeEl.textContent = JSON.stringify(generated[step], null, 2);
    });
    tabsEl.appendChild(btn);
  }

  codeEl.textContent = JSON.stringify(generated[activeTab], null, 2);

  // Scroll
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

// ── Sauvegarde ─────────────────────────────────────

$('#btn-save').addEventListener('click', async () => {
  const saveBtn = $('#btn-save');
  const saveResult = $('#save-result');

  saveBtn.disabled = true;
  saveResult.classList.add('hidden');

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: getConfig(),
        files: generated
      })
    });

    const result = await res.json();

    if (result.ok) {
      saveResult.textContent = `Chapitre sauvegardé dans ${result.path}`;
      saveResult.classList.remove('hidden');
    } else {
      showError(result.error || 'Erreur de sauvegarde');
    }
  } catch (e) {
    showError('Erreur : ' + e.message);
  }

  saveBtn.disabled = false;
});
