import { state, attachToWindow } from './state.js';
import * as utils from './utils.js';
import * as constants from './constants.js';
import * as data from './data.js';
import * as render from './render.js';
import * as events from './events.js';

// Expose state and helpers to window for backward compatibility
attachToWindow();
window.__APP_UTILS__ = utils;
window.__APP_CONSTANTS__ = constants;
window.__APP_DATA__ = data;
window.__APP_RENDER__ = render;
window.__APP_EVENTS__ = events;

// Expose all event handlers to window so HTML onclick attributes work
Object.keys(events).forEach(key => {
    window[key] = events[key];
});

// Apply CSS vars
utils.attachCssVars();

function applyDemoState() {
    const demoBagId = 3;
    const demoItems = [
        { name: 'Billetera', owner: null, loc: 'Entrada', icon: '', category: 'otros' },
        { name: 'Celular', owner: null, loc: 'Dormitorio', icon: '', category: 'otros' },
        { name: 'Notebook', owner: null, loc: 'Dormitorio', icon: '', category: 'otros' },
        { name: 'Cargador Notebook', owner: null, loc: 'Dormitorio', icon: '', category: 'otros' },
        { name: 'Llaves', owner: null, loc: 'Entrada', icon: '', category: 'otros' }
    ];

    const maxId = state.inventory.reduce((max, item) => Math.max(max, item.id || 0), 0);
    const demoInventory = demoItems.map((item, index) => ({
        id: maxId + index + 1,
        ...item
    }));

    state.inventory = [...state.inventory, ...demoInventory];
    state.itemsTrips = demoInventory.map(item => ({
        itemId: item.id,
        tripId: state.currentTripId,
        bagId: demoBagId,
        checked: true
    }));
    state.lockedBags[demoBagId] = true;
}

// Initialize the app
export async function initApp(tabName) {
    state.currentTab = tabName;
    
    // Initialize current trip ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const viajeParam = urlParams.get('viaje');
    const bolsoParam = urlParams.get('bolso');
    const modoParam = urlParams.get('modo');
    const demoParam = urlParams.get('demo');
    
    if (viajeParam) {
        state.currentTripId = parseInt(viajeParam);
    } else {
        state.currentTripId = 1; // Default
    }

    if (demoParam === '1') {
        state.demoMode = true;
        if (document.body) {
            document.body.classList.add('demo-mode');
        }
    }
    
    // Modo asignación
    if (bolsoParam && modoParam === 'asignar') {
        state.assignModeBagId = parseInt(bolsoParam);
        state.assignModeActive = true;
        state.pendingCreateBagIdFromUrl = bolsoParam;
        state.suppressFamilyCreateLinks = true;
    }
    
    // Verificar si hay items recién asignados para destacar
    const storedHighlight = sessionStorage.getItem('highlightItems');
    if (storedHighlight && !state.assignModeActive) {
        state.newlyAssignedItems = JSON.parse(storedHighlight);
        sessionStorage.removeItem('highlightItems');
        setTimeout(() => {
            state.newlyAssignedItems = [];
            render.render();
        }, 2000);
    }

    // Load data
    await data.loadFamily();
    await data.loadPets();
    await data.loadBags();
    await data.loadItemsTrips();
    await data.loadInventory();
    await data.loadTripName();

    if (state.demoMode) {
        applyDemoState();
    }
    
    // Initial render
    render.render();
}

console.info('APP/main.js loaded — App initialized');
