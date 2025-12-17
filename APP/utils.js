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

import { state } from './state.js';

// Obtener items de un bolso para el viaje actual
export function getItemsForBag(bagId) {
    // Obtener relaciones de items para este bolso y viaje actual
    const relations = state.itemsTrips.filter(it => it.bagId === bagId && it.tripId === state.currentTripId);
    
    // Obtener los items correspondientes
    return relations.map(rel => {
        const item = state.inventory.find(i => i.id === rel.itemId);
        if (item) {
            return { ...item, checked: rel.checked, bag: rel.bagId };
        }
        return null;
    }).filter(i => i);
}

// Calcula dinámicamente a quién está asignado un bolso según sus items
export function getBagAssignment(bagId) {
    // Obtener items de este bolso para el viaje actual
    const bagItems = getItemsForBag(bagId);
    
    if (bagItems.length === 0) {
        return { names: [], display: 'Sin items', icons: '' };
    }
    
    // Obtener owners únicos de los items
    const ownerIds = [...new Set(bagItems.map(item => item.owner).filter(o => o))];
    
    if (ownerIds.length === 0) {
        return { names: [], display: 'Sin asignar', icons: '' };
    }
    
    // Buscar los familiares/mascotas correspondientes
    const owners = ownerIds.map(ownerId => {
        const member = state.familyMembers.find(m => m.id === ownerId);
        return member ? { name: member.name, icon: member.icon } : null;
    }).filter(o => o);
    
    if (owners.length === 0) {
        return { names: [], display: 'Sin asignar', icons: '' };
    }
    
    if (owners.length === 1) {
        return {
            names: [owners[0].name],
            display: owners[0].name,
            icons: owners[0].icon
        };
    }
    
    // Múltiples owners
    return {
        names: owners.map(o => o.name),
        display: owners.map(o => o.name).join(', '),
        icons: owners.map(o => o.icon).join(' ')
    };
}
