// Shared constants for the app
export const CARD_GAP = '1rem';
export const DEFAULT_BAG_IMAGE = 'bag-default.jpg';
export const ANIMATION_HIGHLIGHT_MS = 1800;

export const AVAILABLE_LOCATIONS = [
    "Pieza Papás - Closet", 
    "Pieza Papás - Velador Mamá", 
    "Pieza Papás - Velador Papá",
    "Pieza Niños - Cómoda", 
    "Pieza Niños - Baúl Cama",
    "Baño Principal", 
    "Baño Visita",
    "Closet Grande", 
    "Cocina",
    "Comprar"
];

export const ITEM_CATEGORIES = [
    { id: 'ropa', name: 'Ropa', icon: '👕' },
    { id: 'abrigo', name: 'Abrigo', icon: '🧥' },
    { id: 'aseo', name: 'Aseo', icon: '🧴' },
    { id: 'electronica', name: 'Electrónica', icon: '🔌' },
    { id: 'otros', name: 'Otros', icon: '📦' }
];

export function exposeCssVars() {
  try {
    document.documentElement.style.setProperty('--card-gap', CARD_GAP);
  } catch (e) {
    // ignore
  }
}
