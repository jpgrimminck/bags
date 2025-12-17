// Shared constants for the app
export const CARD_GAP = '1rem';
export const DEFAULT_BAG_IMAGE = 'bag-default.jpg';
export const ANIMATION_HIGHLIGHT_MS = 1800;

export function exposeCssVars() {
  try {
    document.documentElement.style.setProperty('--card-gap', CARD_GAP);
  } catch (e) {
    // ignore
  }
}
