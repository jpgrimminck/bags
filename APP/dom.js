// DOM helpers: modal management and previews
import { normalizePhotoPath } from './utils.js';
import { DEFAULT_BAG_IMAGE } from './constants.js';
import { state } from './state.js';

export function setBagModalData(bag) {
  const parentSelect = document.getElementById('bagParent');
  if (parentSelect) {
    // Build options from global `bags` if available
    const allBags = (window.bags && Array.isArray(window.bags)) ? window.bags : [];
    parentSelect.innerHTML = '<option value="">-- Ninguno (Bolso Principal) --</option>' +
      allBags.filter(b => !bag || b.id !== bag.id).map(b => `<option value="${b.id}">${b.icon || ''} ${b.name}</option>`).join('');
  }

  const assignedContainer = document.getElementById('bagAssignedToContainer');
  if (assignedContainer) {
    const currentAssigned = (bag && bag.assignedTo) ? (Array.isArray(bag.assignedTo) ? bag.assignedTo : [bag.assignedTo]) : [];
    assignedContainer.innerHTML = (window.familyMembers || []).map(m => {
      const isChecked = currentAssigned.includes(m.name) ? 'checked' : '';
      return `\n        <label class="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">\n            <input type="checkbox" name="bagAssignedTo" value="${m.name}" class="form-checkbox h-4 w-4 text-blue-600 rounded" ${isChecked}>\n            <span class="text-lg">${m.icon}</span>\n            <span class="text-sm text-gray-700">${m.name}</span>\n        </label>`;
    }).join('');
  }

  if (bag) {
    const bagModalTitle = document.getElementById('bagModalTitle');
    if (bagModalTitle) bagModalTitle.innerText = 'Editar Bolso';
    if (document.getElementById('bagId')) document.getElementById('bagId').value = bag.id;
    if (document.getElementById('bagName')) document.getElementById('bagName').value = bag.name || '';
    if (document.getElementById('bagPhoto')) document.getElementById('bagPhoto').value = bag.photo || '';
    if (document.getElementById('bagPhotoPreview')) document.getElementById('bagPhotoPreview').src = (bag.photo && normalizePhotoPath(bag.photo)) || DEFAULT_BAG_IMAGE;
    if (document.getElementById('bagType')) document.getElementById('bagType').value = bag.type || 'bolso';
    if (document.getElementById('bagParent')) document.getElementById('bagParent').value = bag.parentId || '';
  } else {
    const bagModalTitle = document.getElementById('bagModalTitle');
    if (bagModalTitle) bagModalTitle.innerText = 'Nuevo Bolso';
    if (document.getElementById('bagId')) document.getElementById('bagId').value = '';
    if (document.getElementById('bagName')) document.getElementById('bagName').value = '';
    if (document.getElementById('bagPhoto')) document.getElementById('bagPhoto').value = '';
    if (document.getElementById('bagPhotoPreview')) document.getElementById('bagPhotoPreview').src = DEFAULT_BAG_IMAGE;
    if (document.getElementById('bagType')) document.getElementById('bagType').value = 'bolso';
    if (document.getElementById('bagParent')) document.getElementById('bagParent').value = '';
  }
}

export function openBagModal(bagId = null) {
  const modal = document.getElementById('modal-bag');
  if (!modal) return;
  let bag = null;
  const allBags = (window.bags && Array.isArray(window.bags)) ? window.bags : [];
  if (bagId) bag = allBags.find(b => String(b.id) === String(bagId));
  setBagModalData(bag);
  modal.classList.remove('hidden');
}

export function closeBagModal() {
  const modal = document.getElementById('modal-bag');
  if (!modal) return;
  modal.classList.add('hidden');
}

export function updateBagPhotoPreview() {
  const photoEl = document.getElementById('bagPhoto');
  const preview = document.getElementById('bagPhotoPreview');
  if (!preview) return;
  const photo = photoEl ? photoEl.value : '';
  const normalized = normalizePhotoPath(photo);
  if (photo && !normalized) {
    // invalid format: keep default
    preview.src = DEFAULT_BAG_IMAGE;
    return;
  }
  preview.src = normalized || DEFAULT_BAG_IMAGE;
}

// Zona modal helpers (use window.availableLocations)
export function openZonaModal() {
  const el = document.getElementById('modal-zona');
  if (!el) return;
  const input = document.getElementById('newZonaName');
  if (input) input.value = '';
  el.classList.remove('hidden');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

export function closeZonaModal() {
  const el = document.getElementById('modal-zona');
  if (!el) return;
  el.classList.add('hidden');
  const locSelect = document.getElementById('newItemLocation');
  if (locSelect && locSelect.value === '__nueva_zona__') {
    const prev = window.previousLocationValue || '';
    locSelect.value = prev;
  }
}

export function createNewZona() {
  const nameEl = document.getElementById('newZonaName');
  if (!nameEl) return alert('Elemento nuevo no encontrado');
  const zonaName = nameEl.value.trim();
  if (!zonaName) return alert('Escribe un nombre para la zona');
  const availableLocations = window.availableLocations || [];
  if (availableLocations.includes(zonaName)) return alert('Esta zona ya existe');
  availableLocations.push(zonaName);
  availableLocations.sort((a, b) => {
    if (a === 'Comprar') return 1;
    if (b === 'Comprar') return -1;
    return a.localeCompare(b, 'es');
  });
  const locSelect = document.getElementById('newItemLocation');
  if (locSelect) locSelect.innerHTML = availableLocations.map(l => `<option value="${l}">${l}</option>`).join('') + '<option value="__nueva_zona__">➕ Nueva zona...</option>';
  if (locSelect) locSelect.value = zonaName;
  closeZonaModal();
}

// Attach helpers to window only if not defined to avoid overwriting legacy implementations
export function attachDomHelpersToWindow() {
  if (!window.openBagModal) window.openBagModal = openBagModal;
  if (!window.closeBagModal) window.closeBagModal = closeBagModal;
  if (!window.updateBagPhotoPreview) window.updateBagPhotoPreview = updateBagPhotoPreview;
  if (!window.openZonaModal) window.openZonaModal = openZonaModal;
  if (!window.closeZonaModal) window.closeZonaModal = closeZonaModal;
  if (!window.createNewZona) window.createNewZona = createNewZona;
}
