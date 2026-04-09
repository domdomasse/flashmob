import { getChapterData } from '../data.js';
import { saveCardAnswer, getCardProgress, toggleFavorite, toggleBanned, resetChapter, updateChapterVisit, getPrefs, isCardBanned } from '../store.js';
import { el, onCleanup } from '../render.js';
import { icon, refreshIcons } from '../icons.js';
import { getNextReview, sortBySpacedRepetition } from '../services/spaced.js';

export async function renderFlashcardsTab(container, subjectId, chapterId, { filterSlot } = {}) {
  const data = await getChapterData(subjectId, chapterId, 'cards');
  if (!data) {
    container.appendChild(el('div', { class: 'placeholder' },
      el('div', { class: 'icon' }, icon('layers', 32)),
      el('p', {}, 'Flashcards non disponibles.')
    ));
    return;
  }
  await renderFlashcardsEngine(container, data.cards, data.categories, subjectId, chapterId, filterSlot);
}

export async function renderFlashcardsEngine(container, allCardsRaw, categories, subjectId, chapterId, filterSlot) {
  const prefs = getPrefs();
  const allCards = allCardsRaw;
  const getActiveCards = () => allCards.filter(c => !isCardBanned(`${subjectId}/${chapterId}/${c.id}`));

  let deck = [], currentIdx = 0, isFlipped = false;
  let goodList = [], badList = [];
  let activeFilter = 'all';
  let listMode = false, focusMode = false;
  let animating = false; // lock during card exit animation

  updateChapterVisit(subjectId, chapterId);

  const storeId = (card) => `${card._prefix || (subjectId + '/' + chapterId)}/${card.id}`;
  const catMap = {};
  for (const cat of categories) catMap[cat.id] = cat.label;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ══════════════════════════════════════
  // DOM
  // ══════════════════════════════════════

  const progressText = el('span', {}, '');
  const countGood = el('span', {}, '0');
  const countBad = el('span', {}, '0');
  const progressFill = el('div', { class: 'fc-progress-fill' });

  const listToggleBtn = el('button', { class: 'fc-list-toggle', onClick: toggleListMode }, icon('list', 16));
  const focusToggleBtn = el('button', { class: 'fc-list-toggle', onClick: toggleFocusMode }, icon('maximize-2', 16));

  const stats = el('div', { class: 'fc-stats' },
    progressText,
    el('div', { class: 'fc-badges' },
      el('span', { class: 'fc-badge good' }, icon('check', 14), ' ', countGood),
      el('span', { class: 'fc-badge bad' }, icon('x', 14), ' ', countBad),
      listToggleBtn,
      focusToggleBtn
    )
  );
  const progressBar = el('div', { class: 'fc-progress-wrap' }, progressFill);

  // Filters
  const filtersLine1 = el('div', { class: 'fc-filters' });
  const filtersLine2 = el('div', { class: 'fc-filters fc-filters-special' });
  const filterBtns = [];

  function addFilter(id, label, line, extraClass) {
    const btn = el('button', {
      class: 'fc-filter-btn' + (id === 'all' ? ' active' : '') + (extraClass ? ' ' + extraClass : ''),
      onClick: () => { if (listMode) toggleListMode(); setFilter(id, btn); }
    }, label);
    line.appendChild(btn);
    filterBtns.push(btn);
  }

  addFilter('all', 'Toutes', filtersLine1);
  for (const cat of categories) addFilter(cat.id, cat.label, filtersLine1);
  addFilter('favorites', 'Favoris', filtersLine2, 'fc-filter-special');
  addFilter('weak', 'Points faibles', filtersLine2, 'fc-filter-special');

  const filtersWrap = el('div', { class: 'fc-filters-wrap' }, filtersLine1, filtersLine2);

  // Card list
  const cardListEl = el('div', { class: 'fc-cardlist hidden' });

  // Card elements
  const categoryTag = el('span', { class: 'fc-category-tag' });
  const questionText = el('p', { class: 'fc-question' });
  const answerText = el('p', { class: 'fc-answer' });

  // Swipe overlays (green right / red left)
  const overlayGood = el('div', { class: 'fc-swipe-overlay good' }, icon('check', 32));
  const overlayBad = el('div', { class: 'fc-swipe-overlay bad' }, icon('x', 32));

  const favBtn = el('button', { class: 'fc-fav-btn', onClick: (e) => {
    e.stopPropagation();
    if (currentIdx >= deck.length) return;
    const isFav = toggleFavorite(storeId(deck[currentIdx]));
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', isFav);
  }}, '☆');

  const cardEl = el('div', { class: 'fc-card' },
    el('div', { class: 'fc-card-inner' },
      el('div', { class: 'fc-card-front' },
        categoryTag, questionText,
        el('span', { class: 'fc-hint' }, 'Appuyer pour révéler')
      ),
      el('div', { class: 'fc-card-back' }, answerText)
    ),
    overlayGood, overlayBad
  );
  const cardContainer = el('div', { class: 'fc-card-container' }, favBtn, cardEl);

  const swipeHint = el('p', { class: 'fc-swipe-hint' },
    '◀ swipe pour naviguer \u00a0·\u00a0 tap pour retourner ▶'
  );

  // Actions
  const actionsEl = el('div', { class: 'fc-actions hidden' });
  const btnBad = el('button', { class: 'fc-action-btn bad', onClick: () => answerCard(false) }, icon('x', 18), ' À revoir');
  const btnGood = el('button', { class: 'fc-action-btn good', onClick: () => answerCard(true) }, icon('check', 18), ' Je savais');
  actionsEl.append(btnBad, btnGood);

  const btnPrev = el('button', { disabled: true, onClick: goPrev }, icon('chevron-left', 16), ' Précédente');
  const btnNext = el('button', { onClick: goNext }, 'Suivante ', icon('chevron-right', 16));
  const navEl = el('div', { class: 'fc-nav' }, btnPrev, btnNext);

  // End screen
  const endBarFill = el('div', { class: 'fc-end-bar-fill' });
  const endBarBad = el('div', { class: 'fc-end-bar-bad' });
  const endBar = el('div', { class: 'fc-end-bar' }, endBarFill, endBarBad);
  const endLabel = el('div', { class: 'fc-end-label' });
  const endStats = el('div', { class: 'fc-end-stats-wrap' }, endBar, endLabel);
  const endFailedList = el('div', { class: 'fc-end-failed' });
  const btnRestart = el('button', { class: 'fc-btn-restart', onClick: () => initDeck(getFiltered()) }, icon('refresh-cw', 16), ' Recommencer');
  const btnRetry = el('button', { class: 'fc-btn-retry', onClick: () => { if (badList.length > 0) initDeck([...badList]); } }, icon('repeat', 16), ' Revoir les ratées');
  const btnReset = el('button', { class: 'fc-btn-reset', onClick: handleReset }, icon('trash-2', 16), ' Effacer progression');
  const endEl = el('div', { class: 'fc-end hidden' },
    el('h2', {}, 'Session terminée !'),
    endStats, endFailedList,
    el('div', { class: 'fc-end-actions' }, btnRestart, btnRetry, btnReset)
  );

  const deckArea = el('div', { class: 'fc-deck-area' }, cardContainer, swipeHint, actionsEl, navEl, endEl);

  // Place filters in the dedicated slot (between tabs and content) if available
  if (filterSlot) {
    filterSlot.append(filtersWrap);
  }
  container.append(stats, progressBar, deckArea, cardListEl);

  // ══════════════════════════════════════
  // Focus mode (#10)
  // ══════════════════════════════════════

  function toggleFocusMode() {
    focusMode = !focusMode;
    focusToggleBtn.classList.toggle('active', focusMode);
    container.classList.toggle('fc-focus', focusMode);
  }

  // ══════════════════════════════════════
  // Filter collapse (#9)
  // ══════════════════════════════════════

  let filtersCollapsed = false;
  function collapseFilters() {
    if (filtersCollapsed) return;
    filtersCollapsed = true;
    filtersWrap.classList.add('collapsed');
  }
  function expandFilters() {
    filtersCollapsed = false;
    filtersWrap.classList.remove('collapsed');
  }

  // ══════════════════════════════════════
  // Card list
  // ══════════════════════════════════════

  function toggleListMode() {
    listMode = !listMode;
    listToggleBtn.classList.toggle('active', listMode);
    deckArea.classList.toggle('hidden', listMode);
    cardListEl.classList.toggle('hidden', !listMode);
    if (listMode) { renderCardList(); expandFilters(); }
  }

  function renderCardList() {
    cardListEl.innerHTML = '';
    const filtered = getFilteredAll();
    cardListEl.appendChild(el('p', { class: 'cardlist-info' },
      `${filtered.length} cartes · Appuie sur une carte pour voir la réponse · ✓ = active, 🚫 = bannie`
    ));
    for (const card of filtered) {
      const cardId = storeId(card);
      const progress = getCardProgress(cardId);
      const isBanned = progress && progress.banned;
      const questionDiv = el('div', { class: 'cardlist-q' }, card.q);
      const answerDiv = el('div', { class: 'cardlist-a hidden' });
      answerDiv.innerHTML = card.a;
      const catLabel = catMap[card.cat] || card.cat;
      const banBtn = el('button', {
        class: 'cardlist-ban' + (isBanned ? ' active' : ''),
        onClick: (e) => {
          e.stopPropagation();
          const nowBanned = toggleBanned(cardId);
          banBtn.classList.toggle('active', nowBanned);
          banBtn.textContent = nowBanned ? '🚫' : '✓';
          cardRow.classList.toggle('banned', nowBanned);
        }
      }, isBanned ? '🚫' : '✓');
      const cardRow = el('div', {
        class: 'cardlist-card' + (isBanned ? ' banned' : ''),
        onClick: () => answerDiv.classList.toggle('hidden')
      },
        el('div', { class: 'cardlist-header' },
          el('div', { class: 'cardlist-left' },
            el('span', { class: 'cardlist-cat' }, catLabel), questionDiv),
          banBtn),
        answerDiv
      );
      cardListEl.appendChild(cardRow);
    }
    refreshIcons();
  }

  // ══════════════════════════════════════
  // Filtering
  // ══════════════════════════════════════

  function getFiltered() {
    const active = getActiveCards();
    if (activeFilter === 'favorites') return active.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    if (activeFilter === 'weak') return active.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    if (activeFilter !== 'all') return active.filter(c => c.cat === activeFilter);
    return active;
  }

  function getFilteredAll() {
    if (activeFilter === 'favorites') return allCards.filter(c => { const p = getCardProgress(storeId(c)); return p && p.fav; });
    if (activeFilter === 'weak') return allCards.filter(c => { const p = getCardProgress(storeId(c)); return !p || p.score <= 0; });
    if (activeFilter !== 'all') return allCards.filter(c => c.cat === activeFilter);
    return allCards;
  }

  function setFilter(id, btn) {
    activeFilter = id;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (listMode) { renderCardList(); }
    else {
      const filtered = getFiltered();
      if (filtered.length === 0) initEmpty(id === 'favorites' ? 'Aucun favori pour l\'instant. Appuie sur ☆ pour en ajouter.' : 'Aucune carte dans cette catégorie.');
      else initDeck(filtered);
    }
  }

  // ══════════════════════════════════════
  // Deck logic
  // ══════════════════════════════════════

  function initEmpty(msg) {
    deck = []; currentIdx = 0;
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    actionsEl.style.display = 'none';
    navEl.style.display = 'none';
    endEl.classList.add('hidden');
    let emptyEl = deckArea.querySelector('.fc-empty');
    if (!emptyEl) {
      emptyEl = el('div', { class: 'fc-empty placeholder' }, el('div', { class: 'icon' }, icon('inbox', 32)), el('p', {}));
      deckArea.appendChild(emptyEl);
    }
    emptyEl.querySelector('p').textContent = msg;
    emptyEl.style.display = '';
    expandFilters();
    refreshIcons();
  }

  function initDeck(cards) {
    const emptyEl = deckArea.querySelector('.fc-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    deck = prefs.spacedRepetition
      ? sortBySpacedRepetition([...cards], c => getCardProgress(storeId(c)))
      : shuffle([...cards]);
    currentIdx = 0; goodList = []; badList = [];
    countGood.textContent = '0'; countBad.textContent = '0';
    filtersCollapsed = false; filtersWrap.classList.remove('collapsed');
    cardContainer.style.display = '';
    swipeHint.style.display = '';
    actionsEl.style.display = '';
    actionsEl.classList.add('hidden');
    navEl.style.display = '';
    endEl.classList.add('hidden');
    renderCard();
  }

  function renderCard() {
    if (currentIdx >= deck.length) { showEnd(); return; }
    const card = deck[currentIdx];
    questionText.textContent = card.q;
    answerText.innerHTML = card.a;
    const catLabel = categories.find(c => c.id === card.cat);
    categoryTag.textContent = catLabel ? catLabel.label : card.cat;

    isFlipped = false;
    cardEl.classList.remove('flipped');
    cardEl.style.transform = '';
    actionsEl.classList.add('hidden');
    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';

    const progress = getCardProgress(storeId(card));
    const isFav = progress && progress.fav;
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.classList.toggle('active', !!isFav);

    progressText.textContent = `${currentIdx + 1} / ${deck.length}`;
    progressFill.style.width = (currentIdx / deck.length * 100) + '%';
    btnPrev.disabled = currentIdx === 0;
    btnNext.disabled = false;
    countGood.textContent = goodList.length;
    countBad.textContent = badList.length;
    animating = false;
  }

  function flipCard() {
    if (animating) return;
    isFlipped = !isFlipped;
    cardEl.classList.toggle('flipped', isFlipped);
    actionsEl.classList.toggle('hidden', !isFlipped);
    // Hide fav during flip, show after
    favBtn.style.opacity = '0';
    setTimeout(() => { favBtn.style.opacity = ''; }, 500);
    // Update swipe hint when flipped
    if (isFlipped) swipeHint.textContent = '◀ À revoir \u00a0·\u00a0 tap pour retourner \u00a0·\u00a0 Je savais ▶';
    else swipeHint.textContent = '◀ swipe pour naviguer \u00a0·\u00a0 tap pour retourner ▶';
  }

  function goNext() {
    if (animating) return;
    if (currentIdx < deck.length - 1) { currentIdx++; renderCard(); }
    else if (currentIdx === deck.length - 1) { currentIdx++; showEnd(); }
  }
  function goPrev() { if (!animating && currentIdx > 0) { currentIdx--; renderCard(); } }

  // ══════════════════════════════════════
  // Answer with exit animation (#2)
  // ══════════════════════════════════════

  function answerCard(correct) {
    if (animating) return;
    animating = true;
    const card = deck[currentIdx];
    const id = storeId(card);
    if (correct) goodList.push(card); else badList.push(card);

    if (prefs.spacedRepetition) {
      const progress = getCardProgress(id);
      const spacedData = getNextReview(progress, correct);
      saveCardAnswer(id, correct, spacedData);
    } else {
      saveCardAnswer(id, correct);
    }

    // Collapse filters after first answer (#9)
    collapseFilters();

    // Exit animation
    const dir = correct ? 1 : -1;
    cardEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    cardEl.style.transform = `translateX(${dir * 120}%) rotate(${dir * 10}deg)`;
    cardEl.style.opacity = '0';
    favBtn.style.opacity = '0';

    setTimeout(() => {
      const inner = cardEl.querySelector('.fc-card-inner');
      inner.style.transition = 'none';
      cardEl.style.transition = 'none';
      cardEl.style.transform = 'scale(0.95)';
      cardEl.style.opacity = '0';
      currentIdx++;
      renderCard();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
          cardEl.style.transform = '';
          cardEl.style.opacity = '';
          favBtn.style.opacity = '';
          setTimeout(() => {
            cardEl.style.transition = '';
            inner.style.transition = '';
          }, 150);
        });
      });
    }, 200);
  }

  // ══════════════════════════════════════
  // End screen (#7 + #8)
  // ══════════════════════════════════════

  function showEnd() {
    cardContainer.style.display = 'none';
    swipeHint.style.display = 'none';
    actionsEl.style.display = 'none';
    navEl.style.display = 'none';
    endEl.classList.remove('hidden');
    expandFilters();

    const total = goodList.length + badList.length;
    const pct = total ? Math.round(goodList.length / total * 100) : 0;
    const pctBad = total ? Math.round(badList.length / total * 100) : 0;

    // Animated bar (#7)
    endBarFill.style.width = '0';
    endBarBad.style.width = '0';
    requestAnimationFrame(() => {
      endBarFill.style.width = pct + '%';
      endBarBad.style.width = pctBad + '%';
    });
    endLabel.innerHTML =
      `<span class="fc-end-good">${goodList.length} correcte${goodList.length > 1 ? 's' : ''}</span>` +
      `<span class="fc-end-pct">${pct}%</span>` +
      `<span class="fc-end-bad">${badList.length} à revoir</span>`;

    // Failed cards list (#8)
    endFailedList.innerHTML = '';
    if (badList.length > 0) {
      const failedTitle = el('div', { class: 'fc-end-failed-title' }, `Questions ratées (${badList.length})`);
      endFailedList.appendChild(failedTitle);
      for (const card of badList) {
        const row = el('div', { class: 'fc-end-failed-card' },
          el('div', { class: 'fc-end-failed-q' }, card.q),
          el('div', { class: 'fc-end-failed-a', html: card.a })
        );
        endFailedList.appendChild(row);
      }
    }

    btnRetry.style.display = badList.length === 0 ? 'none' : '';
    progressFill.style.width = '100%';
    refreshIcons();
  }

  function handleReset() {
    if (confirm('Effacer toute ta progression pour ce chapitre ?')) {
      resetChapter(subjectId, chapterId);
      initDeck(getFiltered());
    }
  }

  // ══════════════════════════════════════
  // Touch with real-time feedback (#3)
  // ══════════════════════════════════════

  let tX = 0, tY = 0, touchUsed = false, isDragging = false;

  cardEl.addEventListener('touchstart', e => {
    if (animating) return;
    tX = e.changedTouches[0].clientX;
    tY = e.changedTouches[0].clientY;
    touchUsed = false;
    isDragging = false;
    cardEl.style.transition = 'none';
  }, { passive: true });

  cardEl.addEventListener('touchmove', e => {
    if (animating) return;
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    if (!isDragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isDragging = true;
    }
    if (!isDragging) return;

    // Card tilt
    const rotation = Math.max(-10, Math.min(10, dx * 0.06));
    cardEl.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;

    // Overlay intensity (only when flipped = answering mode)
    if (isFlipped) {
      const intensity = Math.min(Math.abs(dx) / 120, 1);
      if (dx > 0) {
        overlayGood.style.opacity = String(intensity);
        overlayBad.style.opacity = '0';
      } else {
        overlayBad.style.opacity = String(intensity);
        overlayGood.style.opacity = '0';
      }
    }
  }, { passive: true });

  cardEl.addEventListener('touchend', e => {
    if (animating) return;
    const dx = e.changedTouches[0].clientX - tX;
    const dy = e.changedTouches[0].clientY - tY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    touchUsed = true;

    // Reset overlays
    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';

    if (!isDragging && ax < 20 && ay < 20) {
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      flipCard();
    } else if (isDragging && ax > 50 && ax > ay) {
      if (isFlipped) {
        // Swipe to answer
        answerCard(dx > 0);
      } else {
        // Swipe to navigate
        cardEl.style.transition = 'transform 0.2s ease';
        cardEl.style.transform = '';
        dx < 0 ? goNext() : goPrev();
      }
    } else {
      // Snap back
      cardEl.style.transition = 'transform 0.2s ease';
      cardEl.style.transform = '';
    }

    e.preventDefault();
  }, { passive: false });

  cardEl.addEventListener('click', () => {
    if (touchUsed) { touchUsed = false; return; }
    flipCard();
  });

  // ══════════════════════════════════════
  // Keyboard
  // ══════════════════════════════════════

  const abortCtrl = new AbortController();
  onCleanup(() => abortCtrl.abort());

  document.addEventListener('keydown', e => {
    if (listMode || animating) return;
    if (!endEl.classList.contains('hidden')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight') { if (isFlipped) answerCard(true); else goNext(); }
    if (e.key === 'ArrowLeft') { if (isFlipped) answerCard(false); else goPrev(); }
    if ((e.key === 'g' || e.key === 'G') && isFlipped) answerCard(true);
    if ((e.key === 'b' || e.key === 'B') && isFlipped) answerCard(false);
    if (e.key === 'f' || e.key === 'F') favBtn.click();
  }, { signal: abortCtrl.signal });

  // ══════════════════════════════════════
  // Start
  // ══════════════════════════════════════

  initDeck(getActiveCards());
  refreshIcons();
}
