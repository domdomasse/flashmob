/**
 * Flashcards — Print module
 * Generates a recto-verso printable page in a new tab.
 */

export function printCards(cards, cats) {
  if (cards.length === 0) return;

  const isMobile = window.innerWidth < 768;
  const COLS = 2;
  const ROWS = 4;
  const PER_PAGE = COLS * ROWS;
  const catMap = {};
  for (const c of cats) catMap[c.id] = c.label;

  const pages = [];
  for (let i = 0; i < cards.length; i += PER_PAGE) {
    pages.push(cards.slice(i, i + PER_PAGE));
  }

  const totalPages = pages.length * 2;
  let html = '';

  for (const page of pages) {
    // Recto (questions)
    html += '<div class="page"><div class="grid">';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = page[r * COLS + c];
        html += card
          ? `<div class="card front">
              <div class="card-cat">${catMap[card.cat] || ''}</div>
              <div class="card-body">${card.q}</div>
            </div>`
          : '<div class="card empty"></div>';
      }
    }
    html += '</div></div>';

    // Verso (réponses, miroir horizontal)
    html += '<div class="page"><div class="grid">';
    for (let r = 0; r < ROWS; r++) {
      for (let c = COLS - 1; c >= 0; c--) {
        const card = page[r * COLS + c];
        html += card
          ? `<div class="card back">
              <div class="card-cat">${catMap[card.cat] || ''}</div>
              <div class="card-body">${card.a}</div>
            </div>`
          : '<div class="card empty"></div>';
      }
    }
    html += '</div></div>';
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Flashcards — Impression</title>
<style>
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm;
    @top-left {
      content: "Flashmob";
      font-family: 'Quicksand', system-ui, sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      color: #0ea5e9;
    }
    @top-right {
      content: "Flashcards";
      font-family: 'Quicksand', system-ui, sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-family: 'Quicksand', system-ui, sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      color: #94a3b8;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Quicksand', system-ui, sans-serif;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 186mm;
    height: 268mm;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  .grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(${COLS}, 1fr);
    grid-template-rows: repeat(${ROWS}, 1fr);
    gap: 3mm;
  }

  .card {
    border: 0.5pt dashed #94a3b8;
    border-radius: 2mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3mm;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .card.front { background: #f8fafc; }
  .card.back { background: #f0f9ff; }
  .card.empty { border: none; background: none; }

  .card-cat {
    position: absolute;
    top: 2mm;
    left: 3mm;
    font-size: 5.5pt;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .card-body {
    font-size: 7.5pt;
    line-height: 1.3;
    overflow: hidden;
  }
  .card.front .card-body { font-weight: 600; }
  .card.back .card-body strong { color: #0369a1; }

  .info {
    text-align: center;
    padding: 16px;
    color: #64748b;
    font-size: 10pt;
    line-height: 1.6;
  }
  .info strong { color: #0ea5e9; }
  .print-btn {
    margin-top: 10px;
    padding: 10px 24px;
    font-size: 11pt;
    font-weight: 700;
    color: white;
    background: #0ea5e9;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    touch-action: manipulation;
  }
  .print-btn:active { opacity: 0.7; }
  .back-btn {
    margin-top: 10px;
    margin-left: 8px;
    padding: 10px 24px;
    font-size: 11pt;
    font-weight: 700;
    color: #64748b;
    background: #e2e8f0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    touch-action: manipulation;
  }
  .back-btn:active { opacity: 0.7; }

  @media print {
    .info { display: none; }
  }

  @media screen {
    body { background: #e2e8f0; padding: 20px; }
    .page {
      background: white;
      width: 210mm;
      height: 277mm;
      margin: 0 auto 20px;
      padding: 8mm;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
    }
    .info { margin-bottom: 20px; }
  }
</style>
</head>
<body>
  <div class="info">
    <strong>${cards.length}</strong> flashcards · ${totalPages} pages<br>
    Imprimer en <strong>recto-verso bord long</strong> · Découper le long des pointillés ✂<br>
    <button onclick="${isMobile ? 'history.back()' : 'window.close()'}" class="back-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Retour</button>
    <button onclick="window.print()" class="print-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg> Imprimer</button>
  </div>
  ${html}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  <\/script>
</body>
</html>`;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}
