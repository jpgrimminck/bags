// General utilities moved out from app.js
import { CARD_GAP, DEFAULT_BAG_IMAGE, exposeCssVars, ANIMATION_HIGHLIGHT_MS } from './constants.js';

export function normalizePhotoPath(photo) {
  if (!photo) return '';
  const trimmed = String(photo).trim();
  // Absolute URL or data URI: keep
  if (/^(https?:\/\/|data:)/i.test(trimmed)) return trimmed;
  // Already pointing into images/ or starts with /: keep
  if (trimmed.startsWith('images/') || trimmed.startsWith('/')) return trimmed;
  // Accept only JPEG filenames
  if (/^[\w0-9\-_.]+\.(jpe?g)$/i.test(trimmed)) {
    return `images/bags/${trimmed}`;
  }
  return '';
}

export function applyInlineCardGapIfNeeded() {
  try {
    const grid = document.querySelector('.family-grid');
    const needFallback = document.documentElement.classList.contains('no-flex-gap') || (grid && getComputedStyle(grid).gap === '0px');
    if (!needFallback) return;
    document.querySelectorAll('.family-column').forEach(el => {
      el.style.marginBottom = CARD_GAP;
    });
  } catch (e) {
    console.warn('applyInlineCardGapIfNeeded error', e);
  }
}

export function scrollToFamilyCreate(familyName) {
  if (!familyName) return;
  try {
    const headers = document.querySelectorAll('.family-column h3');
    let target = null;
    headers.forEach(h => {
      if (!target && h.textContent && h.textContent.toLowerCase().includes(familyName.toLowerCase())) {
        target = h.closest('.family-column');
      }
    });
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const original = target.style.boxShadow;
      target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
      setTimeout(() => { target.style.boxShadow = original || ''; }, ANIMATION_HIGHLIGHT_MS);
    }
  } catch (e) {
    console.warn('scrollToFamilyCreate error', e);
  }
}

export function attachCssVars() {
  try { exposeCssVars(); } catch(e){}
}
