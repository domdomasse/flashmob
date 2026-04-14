/**
 * Export cours/résumé as a printable HTML page (print to PDF via browser).
 */

function boldify(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderMarkdownToHtml(text) {
  let html = '';
  for (const block of text.split('\n\n')) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');

    if (lines.every(l => l.trim().startsWith('- ') || l.trim() === '')) {
      html += '<ul>';
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('- ')) html += `<li>${boldify(t.slice(2))}</li>`;
      }
      html += '</ul>';
    } else if (lines.every(l => /^\d+\.\s/.test(l.trim()) || l.trim() === '')) {
      html += '<ol>';
      for (const line of lines) {
        const match = line.trim().match(/^\d+\.\s(.+)/);
        if (match) html += `<li>${boldify(match[1])}</li>`;
      }
      html += '</ol>';
    } else {
      html += `<p>${boldify(trimmed.replace(/\n/g, '<br>'))}</p>`;
    }
  }
  return html;
}

export function exportContent(data, title, type) {
  const isMobile = window.innerWidth < 768;
  let body = '';

  for (const section of data.sections) {
    body += `<div class="section">`;
    body += `<h2>${section.title}</h2>`;

    if (section.content) {
      body += `<div class="text">${renderMarkdownToHtml(section.content)}</div>`;
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        body += `<div class="subsection">`;
        body += `<h3>${sub.title}</h3>`;
        body += `<div class="text">${renderMarkdownToHtml(sub.content)}</div>`;
        body += `</div>`;
      }
    }

    body += `</div>`;
  }

  const typeLabel = type === 'cours' ? 'Cours' : 'Résumé';

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} — ${typeLabel}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 16mm 20mm 14mm;
    @top-left {
      content: "${title.replace(/"/g, '\\"')}";
      font-family: 'Quicksand', system-ui, sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      color: #0ea5e9;
    }
    @top-right {
      content: "${typeLabel}";
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
    font-size: 10pt;
    line-height: 1.65;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .title-block {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #0ea5e9;
  }
  .title-block h1 {
    font-size: 16pt;
    color: #0ea5e9;
    margin-bottom: 4px;
  }
  .title-block .type {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  h2 {
    font-size: 13pt;
    color: #0ea5e9;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }
  .subsection {
    margin-bottom: 14px;
    padding-left: 14px;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .text p { margin-bottom: 8px; }
  .text strong { color: #0ea5e9; }
  .text ul, .text ol { margin: 6px 0 10px 20px; }
  .text li { margin-bottom: 4px; }
  .text li::marker { color: #0ea5e9; }

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

  @media print {
    .info { display: none; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 20px; }
    .content {
      background: white;
      max-width: 210mm;
      margin: 0 auto;
      padding: 18mm 20mm;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
    }
    .info { margin-bottom: 20px; }
  }
</style>
</head>
<body>
  <div class="info">
    <strong>${title}</strong> — ${typeLabel}<br>
    <button onclick="${isMobile ? 'history.back()' : 'window.close()'}" class="back-btn" style="margin-top:10px;margin-left:8px;padding:10px 24px;font-size:11pt;font-weight:700;color:#64748b;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Retour</button>
    <button onclick="window.print()" class="print-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg> Imprimer</button>
  </div>
  <div class="content">
    <div class="title-block">
      <h1>${title}</h1>
      <div class="type">${typeLabel}</div>
    </div>
    ${body}
  </div>
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
