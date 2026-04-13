/**
 * Flashcards — Drag/swipe module
 * Sets up pointer events for free-drag card manipulation.
 *
 * @param {Object} ctx - Shared context from the main flashcards engine
 * @param {Function} ctx.getState - Returns { isFlipped, animating, listMode, focusMode }
 * @param {Function} ctx.setLastDragTime - Sets the last drag timestamp
 * @param {HTMLElement} ctx.cardEl - The card element
 * @param {HTMLElement} ctx.cardContainer - The card container
 * @param {HTMLElement} ctx.overlayGood - Good swipe overlay
 * @param {HTMLElement} ctx.overlayBad - Bad swipe overlay
 * @param {HTMLElement} ctx.overlaySkip - Skip swipe overlay
 * @param {HTMLElement} ctx.favBtn - Favorite button (excluded from capture)
 * @param {Function} ctx.flipCard - Flip the card
 * @param {Function} ctx.answerCard - Answer the card (correct: boolean)
 * @param {Function} ctx.goNext - Skip to next card
 */
export function setupDrag(ctx) {
  const {
    cardEl, cardContainer, overlayGood, overlayBad, overlaySkip,
    flipCard, answerCard, goNext, getState, setLastDragTime
  } = ctx;

  // Safety net: prevent ALL native touch gestures on the card area
  cardEl.addEventListener('touchstart', e => {
    if (e.target.closest('.fc-fav-btn')) return;
    e.preventDefault();
  }, { passive: false });
  cardEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  let dragging = false, startX = 0, startY = 0, hasMoved = false;
  const DRAG_THRESHOLD = 10;
  const SWIPE_H = 80;
  const SWIPE_V = 60;

  cardEl.addEventListener('pointerdown', e => {
    const { animating, listMode } = getState();
    if (animating || listMode) return;
    if (e.target.closest('.fc-fav-btn')) return;
    dragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    cardEl.setPointerCapture(e.pointerId);
    cardEl.style.transition = 'none';
  });

  cardEl.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const { isFlipped } = getState();

    if (!hasMoved && ax < DRAG_THRESHOLD && ay < DRAG_THRESHOLD) return;
    if (!hasMoved) {
      cardContainer.classList.add('dragging');
      document.body.style.overflow = 'hidden';
    }
    hasMoved = true;

    const rotation = Math.max(-15, Math.min(15, dx * 0.08));
    cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;

    const dominantH = ax > ay && ax > 20;
    const dominantV = dy > 20 && dy > ax;

    if (isFlipped && dominantH) {
      const intensity = Math.min(ax / SWIPE_H, 1);
      overlayGood.style.opacity = dx > 0 ? String(intensity) : '0';
      overlayBad.style.opacity = dx < 0 ? String(intensity) : '0';
      overlaySkip.style.opacity = '0';
    } else if (dominantV) {
      const intensity = Math.min(dy / SWIPE_V, 1);
      overlaySkip.style.opacity = String(intensity);
      overlayGood.style.opacity = '0';
      overlayBad.style.opacity = '0';
    } else {
      overlayGood.style.opacity = '0';
      overlayBad.style.opacity = '0';
      overlaySkip.style.opacity = '0';
    }
  });

  cardEl.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    cardEl.releasePointerCapture(e.pointerId);
    const { isFlipped } = getState();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const ax = Math.abs(dx), ay = Math.abs(dy);

    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';
    overlaySkip.style.opacity = '0';
    cardContainer.classList.remove('dragging');
    document.body.style.overflow = '';

    // Tap → flip
    if (!hasMoved) {
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      flipCard();
      return;
    }

    setLastDragTime(Date.now());

    // Vertical drag down → skip
    if (dy > SWIPE_V && dy > ax) {
      const { animating } = getState();
      if (!animating) goNext();
      return;
    }

    // Flipped + horizontal → answer
    if (isFlipped && ax > SWIPE_H && ax > ay) {
      answerCard(dx > 0);
      return;
    }

    // Not flipped + horizontal → flip
    if (!isFlipped && ax > SWIPE_H && ax > ay) {
      cardEl.style.transition = 'transform 0.3s ease';
      cardEl.style.transform = '';
      flipCard();
      return;
    }

    // Below thresholds → snap back
    cardEl.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
    cardEl.style.transform = '';
    cardEl.style.opacity = '';
  });

  cardEl.addEventListener('pointercancel', e => {
    if (!dragging) return;
    dragging = false;
    try { cardEl.releasePointerCapture(e.pointerId); } catch {};
    overlayGood.style.opacity = '0';
    overlayBad.style.opacity = '0';
    overlaySkip.style.opacity = '0';
    cardContainer.classList.remove('dragging');
    document.body.style.overflow = '';
    cardEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    cardEl.style.transform = '';
    cardEl.style.opacity = '';
  });
}
