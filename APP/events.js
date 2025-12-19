import { state } from './state.js';
import { render, updateHeaderCounter, updateBagProgress, updateSearchResults, updateHeaderStats } from './render.js';
import { saveItemsTrips, saveInventory } from './data.js';
import { getItemsForBag, normalizePhotoPath, scrollToFamilyCreate } from './utils.js';
import { AVAILABLE_LOCATIONS } from './constants.js';

// --- EVENT HANDLERS ---

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

export function toggleHeaderSearch() {
    state.headerSearchOpen = !state.headerSearchOpen;
    const searchBar = document.getElementById('headerSearch');
    const mainBar = document.getElementById('headerMain');
    const searchInput = document.getElementById('headerSearchInput');
    
    if (state.headerSearchOpen) {
        searchBar.classList.add('open');
        mainBar.style.visibility = 'hidden';
        searchInput.focus();
    } else {
        searchBar.classList.remove('open');
        mainBar.style.visibility = 'visible';
        const dropdown = document.getElementById('searchDropdown');
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        if (state.searchTerm) {
            state.searchTerm = '';
            searchInput.value = '';
            document.getElementById('headerClearBtn').classList.add('hidden');
        }
    }
}

export function clearHeaderSearch() {
    const input = document.getElementById('headerSearchInput');
    const dropdown = document.getElementById('searchDropdown');
    input.value = '';
    state.searchTerm = '';
    document.getElementById('headerClearBtn').classList.add('hidden');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.focus();
}

export function toggleItem(id, bagId) {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;
    
    const effectiveBagId = bagId !== undefined ? bagId : null;
    
    if (effectiveBagId && state.lockedBags[effectiveBagId]) {
        return;
    }
    
    // Actualizar el estado en itemsTrips
    const tripItem = state.itemsTrips.find(it => it.itemId === id && it.tripId === state.currentTripId);
    if (tripItem) {
        tripItem.checked = !tripItem.checked;
    }
    saveItemsTrips();
    
    const newChecked = tripItem ? tripItem.checked : !item.checked;
    
    // Actualizar item.checked
    item.checked = newChecked;
    
    const itemElement = document.querySelector(`[data-item-id="${id}"]`);
    if (itemElement) {
        const textDiv = itemElement.querySelector('.flex-1 > div:first-child');
        if (textDiv) {
            textDiv.className = `${newChecked ? 'line-through text-gray-400' : 'text-gray-800'} font-medium text-sm flex items-center flex-wrap`;
        }
        const checkbox = itemElement.querySelector('.flex-shrink-0 .w-6');
        if (checkbox) {
            checkbox.className = `w-6 h-6 border-2 rounded-full flex items-center justify-center ${newChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`;
            checkbox.innerHTML = newChecked ? '<i class="fa-solid fa-check text-white text-xs"></i>' : '';
        }
        updateHeaderCounter();
        if (effectiveBagId) updateBagProgress(effectiveBagId);
    } else {
        render();
    }
    
    if (state.searchTerm && state.currentTab === 'bolsos') {
        setTimeout(() => {
            const input = document.getElementById('searchInput');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 0);
    }
}

export function togglePendingItem(id) {
    const index = state.pendingAssignItems.indexOf(id);
    if (index > -1) {
        state.pendingAssignItems.splice(index, 1);
    } else {
        state.pendingAssignItems.push(id);
    }
    render();
}

export function confirmPendingItems() {
    const bagId = state.assignModeBagId;
    state.pendingAssignItems.forEach(itemId => {
        const item = state.inventory.find(i => i.id === itemId);
        if (item) {
            item.bag = bagId;
            // Update itemsTrips
            const tripItem = state.itemsTrips.find(it => it.itemId === itemId && it.tripId === state.currentTripId);
            if (tripItem) {
                tripItem.bagId = bagId;
            } else {
                // If not exists, create it
                state.itemsTrips.push({
                    itemId: itemId,
                    tripId: state.currentTripId,
                    bagId: bagId,
                    checked: false
                });
            }
        }
    });
    saveItemsTrips();
    saveInventory();
    state.pendingAssignItems = [];
    // Redirect back to index.html
    window.location.href = `index.html?viaje=${state.currentTripId}`;
}

export function toggleSearchItem(id) {
    const item = state.inventory.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        updateHeaderStats();
        updateSearchResults(state.searchTerm);
    }
}

export function toggleBagExpand(bagId) {
    if (window.innerWidth >= 768) return;
    const currentState = state.expandedBags[bagId] !== false;
    state.expandedBags[bagId] = !currentState;
    render();
}

export function toggleBagEditMenu(bagId) {
    if (state.openBagMenu === bagId) {
        state.openBagMenu = null;
    } else {
        state.openBagMenu = bagId;
    }
    // Mostrar/ocultar el menú
    document.querySelectorAll('[id^="bag-edit-menu-"]').forEach(menu => {
        menu.classList.add('hidden');
    });
    if (state.openBagMenu) {
        const menu = document.getElementById('bag-edit-menu-' + bagId);
        if (menu) menu.classList.remove('hidden');
    }
}

export function startRemovingItems(bagId) {
    state.openBagMenu = null;
    state.removingFromBag[bagId] = true;
    render();
}

export function cancelRemovingItems(bagId) {
    state.removingFromBag[bagId] = false;
    render();
}

export function toggleBagLock(bagId) {
    state.openBagMenu = null;
    state.lockedBags[bagId] = !state.lockedBags[bagId];
    render();
}

export function showUnlockModal(bagId) {
    // Crear modal si no existe
    let modal = document.getElementById('unlockBagModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'unlockBagModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs text-center">
                <h3 class="text-lg font-bold mb-4 text-gray-800">¿Quieres editar el bolso?</h3>
                <div class="flex gap-2 justify-between mt-2">
                    <button id="unlockBagNo" class="w-24 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium text-sm">No</button>
                    <button id="unlockBagYes" class="w-32 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm">Sí</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }
    // Botón Sí
    document.getElementById('unlockBagYes').onclick = function() {
        state.lockedBags[bagId] = false;
        modal.style.display = 'none';
        render();
    };
    // Botón No
    document.getElementById('unlockBagNo').onclick = function() {
        modal.style.display = 'none';
    };
}

export function removeItemFromBag(itemId, bagId) {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    if (!item.owner && item.bag) {
        const bag = state.bags.find(b => b.id === item.bag);
        if (bag && bag.assignedTo) {
            const assignees = Array.isArray(bag.assignedTo) ? bag.assignedTo : [bag.assignedTo];
            const firstAssignee = assignees[0];
            if (firstAssignee !== 'Todos') {
                item.owner = firstAssignee;
            }
        }
    }
    
    item.bag = null;
    item.checked = false;
    
    // Actualizar itemsTrips
    const tripItem = state.itemsTrips.find(it => it.itemId === itemId && it.tripId === state.currentTripId);
    if (tripItem) {
        tripItem.bagId = null;
        tripItem.checked = false;
    }
    saveItemsTrips();
    saveInventory();
    
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        const parentList = itemElement.parentElement;
        if (parentList) {
            parentList.style.pointerEvents = 'none';
        }
        
        itemElement.classList.add('item-swipe-out');
        
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        setTimeout(() => {
            itemElement.remove();
            updateHeaderCounter();
            const bagItems = getItemsForBag(bagId);
            const checkedItems = bagItems.filter(i => i.checked).length;
            const totalItems = bagItems.length;
            const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;
            
            const countEl = document.getElementById(`bag-count-${bagId}`);
            if (countEl) {
                countEl.textContent = `${totalItems} items`;
            }
            const progressEl = document.getElementById(`bag-progress-${bagId}`);
            if (progressEl) {
                progressEl.style.width = `${progress}%`;
            }
            const ratioEl = document.getElementById(`bag-ratio-${bagId}`);
            if (ratioEl) {
                ratioEl.textContent = `${checkedItems}/${totalItems}`;
            }
            if (document.activeElement) {
                document.activeElement.blur();
            }
            setTimeout(() => {
                if (parentList) {
                    parentList.style.pointerEvents = 'auto';
                }
            }, 100);
        }, 300);
    }
}

export function openModalForBag(bagId, name = '') {
    // If not on items page or the modal element is not present here, redirect to items.html
    const modalEl3 = document.getElementById('modal-add');
    if (!window.location.href.includes('items.html') || !modalEl3) {
        sessionStorage.setItem('createFromBag', JSON.stringify({ bagId, name }));
        window.location.href = `items.html`;
        return;
    }

    modalEl3.classList.remove('hidden'); 
    
    const itemsList = document.getElementById('newItemsList');
    if (name) {
        itemsList.innerHTML = `<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" value="${name}" enterkeyhint="next">`;
        state.searchTerm = '';
    } else {
        itemsList.innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    }
    
    const familySelect = document.getElementById('newItemFamily');
    const familiesWithBags = state.familyMembers.filter(m => 
        state.bags.some(b => b.assignedTo === m.name || (Array.isArray(b.assignedTo) && b.assignedTo.includes(m.name)))
    );
    const allAssignees = state.bags.map(b => Array.isArray(b.assignedTo) ? b.assignedTo : [b.assignedTo]).flat();
    const specialAssignees = [...new Set(allAssignees)]
        .filter(a => a && !state.familyMembers.some(m => m.name === a));
    
    familySelect.innerHTML = familiesWithBags.map(m => 
        `<option value="${m.name}">${m.icon} ${m.name}</option>`
    ).join('') + specialAssignees.map(s => 
        `<option value="${s}">${s === 'Todos' ? '👨‍👩‍👧‍👦' : '📦'} ${s}</option>`
    ).join('');
    
    const locSelect = document.getElementById('newItemLocation');
    locSelect.innerHTML = AVAILABLE_LOCATIONS.map(l => `<option value="${l}">${l}</option>`).join('') + 
        '<option value="__nueva_zona__">➕ Nueva zona...</option>';
    locSelect.addEventListener('change', handleLocationChange);

    if (bagId) {
        const bag = state.bags.find(b => b.id === bagId);
        if (bag) {
            const assignee = Array.isArray(bag.assignedTo) ? bag.assignedTo[0] : bag.assignedTo;
            familySelect.value = assignee;
            onFamilyChange();
            document.getElementById('newItemBag').value = bagId;
            const bagSelect = document.getElementById('newItemBag');
            bagSelect.disabled = true;
            checkBagType();
            return;
        }
    }

    onFamilyChange();
}

export function openModalWithName(name) {
    openModalForBag(null, name);
}

export function saveBagName(bagId, event) {
    event.stopPropagation();
    const input = document.getElementById('edit-bag-name-input');
    const newName = input.value.trim();
    if (!newName) {
        alert('El nombre no puede estar vacío');
        return;
    }
    const bag = state.bags.find(b => b.id === bagId);
    if (bag) {
        bag.name = newName;
    }
    state.editingBagName = null;
    render();
}

export function cancelEditBagName(event) {
    event.stopPropagation();
    state.editingBagName = null;
    render();
}

// --- Helper functions for modal logic ---

function onFamilyChange() {
    const familyName = document.getElementById('newItemFamily').value;
    const familyBags = state.bags.filter(b => 
        b.assignedTo === familyName || 
        (Array.isArray(b.assignedTo) && b.assignedTo.includes(familyName))
    );
    
    const bagSelectSection = document.getElementById('bagSelectSection');
    const bagAutoSection = document.getElementById('bagAutoSection');
    const bagSelect = document.getElementById('newItemBag');
    
    if (familyBags.length === 0) {
        bagSelectSection.classList.add('hidden');
        bagAutoSection.classList.add('hidden');
    } else if (familyBags.length === 1) {
        bagSelectSection.classList.add('hidden');
        bagAutoSection.classList.remove('hidden');
        document.getElementById('bagAutoName').textContent = `${familyBags[0].icon} ${familyBags[0].name}`;
        bagSelect.innerHTML = `<option value="${familyBags[0].id}">${familyBags[0].icon} ${familyBags[0].name}</option>`;
    } else {
        bagSelectSection.classList.remove('hidden');
        bagAutoSection.classList.add('hidden');
        bagSelect.innerHTML = familyBags.map(b => 
            `<option value="${b.id}">${b.icon} ${b.name}</option>`
        ).join('');
    }
    
    checkBagType();
}

function checkBagType() {
    const bagId = document.getElementById('newItemBag').value;
    const bag = state.bags.find(b => b.id === bagId);
    const tempSection = document.getElementById('tempSection');
    
    if (bag && bag.type === 'cooler') {
        tempSection.classList.remove('hidden');
    } else {
        tempSection.classList.add('hidden');
        document.getElementById('newItemTemp').value = 'ambient';
    }
}

let previousLocationValue = '';

function handleLocationChange(e) {
    if (e.target.value === '__nueva_zona__') {
        previousLocationValue = AVAILABLE_LOCATIONS[0] || '';
        openZonaModal();
    }
}

export function openZonaModal() {
    document.getElementById('newZonaName').value = '';
    document.getElementById('modal-zona').classList.remove('hidden');
    setTimeout(() => document.getElementById('newZonaName').focus(), 100);
}

export function closeZonaModal() {
    document.getElementById('modal-zona').classList.add('hidden');
    const locSelect = document.getElementById('newItemLocation');
    if (locSelect.value === '__nueva_zona__') {
        locSelect.value = previousLocationValue;
    }
}

export function createNewZona() {
    const zonaName = document.getElementById('newZonaName').value.trim();
    if (!zonaName) return alert("Escribe un nombre para la zona");
    
    if (AVAILABLE_LOCATIONS.includes(zonaName)) {
        alert("Esta zona ya existe");
        return;
    }
    
    AVAILABLE_LOCATIONS.push(zonaName);
    AVAILABLE_LOCATIONS.sort((a, b) => {
        if (a === 'Comprar') return 1;
        if (b === 'Comprar') return -1;
        return a.localeCompare(b, 'es');
    });
    
    const locSelect = document.getElementById('newItemLocation');
    locSelect.innerHTML = AVAILABLE_LOCATIONS.map(l => `<option value="${l}">${l}</option>`).join('') + 
        '<option value="__nueva_zona__">➕ Nueva zona...</option>';
    
    locSelect.value = zonaName;
    
    document.getElementById('modal-zona').classList.add('hidden');
}

export function closeModal() { 
    document.getElementById('modal-add').classList.add('hidden');
    document.getElementById('newItemsList').innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    const bagSelect = document.getElementById('newItemBag');
    const familySelect = document.getElementById('newItemFamily');
    if (bagSelect) bagSelect.disabled = false;
    if (familySelect) familySelect.disabled = false;
    state.openBagMenu = null;
}

export function addNewItemInput() {
    const container = document.getElementById('newItemsList');
    const newInput = document.createElement('div');
    newInput.className = 'flex gap-2';
    newInput.innerHTML = `
        <input type="text" class="new-item-input flex-1 border p-3 rounded-lg text-base" placeholder="Ej. Otro item" enterkeyhint="next">
        <button onclick="this.parentElement.remove()" class="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    container.appendChild(newInput);
    newInput.querySelector('input').focus();
}

export function saveNewItems() {
    const inputs = document.querySelectorAll('.new-item-input');
    const names = [];
    inputs.forEach(input => {
        const name = input.value.trim();
        if (name) names.push(name);
    });
    
    if (names.length === 0) return alert("Escribe al menos un item");
    
    const bagId = document.getElementById('newItemBag').value;
    const loc = document.getElementById('newItemLocation').value;
    const temp = document.getElementById('newItemTemp').value;
    
    const bag = state.bags.find(b => b.id === bagId);

    if (bag && bag.type === 'cooler' && temp === 'ambient') {
        if(!confirm('¿Seguro que quieres poner algo a temperatura ambiente en el Cooler?')) return;
    }

    const newItemIds = [];
    names.forEach(name => {
        const newItemId = Date.now() + Math.random();
        newItemIds.push(newItemId);
        const newItem = {
            id: newItemId,
            name: name,
            description: '',
            category: 'otros',
            bag: bagId,
            loc: loc,
            checked: false,
            icon: "",
            temperature: temp
        };
        state.inventory.push(newItem);
    });
    
    saveInventory();
    closeModal();
    render();
    
    if (newItemIds.length > 0) {
        setTimeout(() => {
            newItemIds.forEach(id => {
                const itemElement = document.querySelector(`[data-item-id="${id}"]`);
                if (itemElement) {
                    itemElement.classList.add('item-highlight');
                }
            });
            const firstItem = document.querySelector(`[data-item-id="${newItemIds[0]}"]`);
            if (firstItem) {
                firstItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
}

import * as data from './data.js';

export async function clearLocalData() {
    // Clear localStorage to remove saved changes
    localStorage.removeItem('inventory');
    localStorage.removeItem('itemsTrips');
    
    // Reset in-memory state from JSON files (no localStorage usage)
    await data.loadFamily();
    await data.loadPets();
    await data.loadBags();
    await data.loadItemsTrips();
    await data.loadInventory();
    await data.loadTripName();
    // Reset transient UI state
    state.newItems = [];
    state.openBagMenu = null;
    state.editingBags = {};
    state.editingBagName = null;
    state.removingFromBag = {};
    state.assignModeActive = false;
    state.assignModeBagId = null;

    render();
    
    // Show "JSON Original" message for 1 second
    const message = document.createElement('div');
    message.textContent = 'JSON Original';
    message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-xl font-bold px-4 py-2 rounded-lg z-50';
    document.body.appendChild(message);
    setTimeout(() => {
        message.remove();
    }, 1000);
}

// --- CREACIÓN DE ITEMS ---

export function startCreateItem(familyName) {
    state.creatingItemForOwner = familyName;
    state.newItemText = '';
    state.newItemMatches = [];
    render();
    setTimeout(() => {
        const input = document.getElementById(`create-input-${familyName}`);
        if (input) {
            state.currentCreateInput = input;
            input.focus();
            input.setSelectionRange(state.newItemText.length, state.newItemText.length);
            // Para móvil, forzar teclado si es necesario
            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                input.blur();
                setTimeout(() => input.focus(), 10);
            }
        }
    }, 100);
}

export function updateNewItemText(text) {
    state.newItemText = text;
    // Filtrar matches en segundo plano
    setTimeout(() => {
        const familyItems = state.inventory.filter(item => {
            const ownerMember = state.familyMembers.find(m => m.id === item.owner);
            return ownerMember && ownerMember.name === state.creatingItemForOwner;
        });
        state.newItemMatches = familyItems.filter(item => 
            item.name.toLowerCase().includes(text.toLowerCase())
        );
        render();
        // Mantener foco en el input
        setTimeout(() => {
            const input = document.getElementById(`create-input-${state.creatingItemForOwner}`);
            if (input) {
                input.focus();
                input.setSelectionRange(text.length, text.length);
            }
        }, 0);
    }, 0);
}

export function cancelCreateItem() {
    state.creatingItemForOwner = null;
    state.newItemText = '';
    state.newItemMatches = [];
    render();
}

export function createNewItem() {
    if (!state.newItemText.trim()) return;
    const ownerMember = state.familyMembers.find(m => m.name === state.creatingItemForOwner);
    if (!ownerMember) return;
    
    const newItem = {
        id: Date.now(),
        name: state.newItemText.trim(),
        owner: ownerMember.id,
        category: 'otros',
        loc: 'Casa',
        checked: false,
        icon: ''
    };
    
    state.inventory.push(newItem);
    state.inventory.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    
    // Guardar en localStorage
    saveInventory();
    
    // Marcar como nuevo para resaltar
    state.newlyCreatedItem = newItem.id;
    setTimeout(() => {
        state.newlyCreatedItem = null;
        render();
    }, 1000);
    
    cancelCreateItem();
    render();
}
