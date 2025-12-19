import { state } from './state.js';
import { normalizePhotoPath } from './utils.js';

// Cargar familiares desde family.json
export async function loadFamily() {
    try {
        const response = await fetch('JSON/family.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        state.familyMembers = await response.json();
    } catch (e) {
        console.error("No se pudo cargar la familia:", e);
    }
}

// Cargar mascotas desde pets.json
export async function loadPets() {
    try {
        const response = await fetch('JSON/pets.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        state.pets = await response.json();
    } catch (e) {
        console.error("No se pudo cargar las mascotas:", e);
    }
}

// Cargar bolsos desde bags.json
export async function loadBags() {
    try {
        const response = await fetch('JSON/bags.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let bagsData = await response.json();
        // Normalize photo paths
        state.bags = bagsData.map(b => ({ ...b, photo: normalizePhotoPath(b.photo) }));
    } catch (e) {
        console.error("No se pudo cargar los bolsos:", e);
    }
}

// Cargar relaciones items-viajes desde items_trips.json (siempre desde el archivo, sin usar localStorage)
export async function loadItemsTrips() {
    try {
        const response = await fetch('JSON/items_trips.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        state.itemsTrips = await response.json();
    } catch (e) {
        console.error("No se pudo cargar items_trips:", e);
        state.itemsTrips = [];
    }
}

// Cargar inventario
export async function loadInventory() {
    try {
        const response = await fetch('JSON/inventario.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let inventoryData = await response.json();
        
        // Do not load new items from localStorage: new items are temporary in-memory only and disappear on reload
        state.newItems = [];
        state.inventory = [...inventoryData];
    } catch (e) {
        console.error("No se pudo cargar el inventario:", e);
    }
}

// Cargar nombre del viaje activo desde viajes.json
export async function loadTripName() {
    try {
        const response = await fetch('JSON/viajes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const viajes = await response.json();
        // Guardar todos los viajes
        state.allTrips = viajes;
        
        // Buscar el viaje según currentTripId, o el activo, o el primero
        let viajeActivo = null;
        if (state.currentTripId) {
            viajeActivo = viajes.find(v => v.id === state.currentTripId);
        }
        if (!viajeActivo) {
            viajeActivo = viajes.find(v => v.activo) || viajes[0];
            if (viajeActivo) {
                state.currentTripId = viajeActivo.id;
            }
        }
        
        if (viajeActivo) {
            state.currentTripName = viajeActivo.nombre;
            const tripTitle = document.getElementById('tripTitle');
            if (tripTitle) {
                tripTitle.classList.remove('loading-dots');
                tripTitle.textContent = `Viaje ${viajeActivo.nombre}`;
            }
        }
    } catch (e) {
        console.error("No se pudo cargar el nombre del viaje:", e);
        const tripTitle = document.getElementById('tripTitle');
        if (tripTitle) {
            tripTitle.classList.remove('loading-dots');
            tripTitle.textContent = 'Viaje';
        }
    }
}

// Save itemsTrips in memory only (do NOT persist to localStorage). This keeps data identical across devices
export function saveItemsTrips() {
    // In-memory state already updated by callers; no persistence to localStorage.
    // Keeping this function so existing calls (toggleItem, etc.) remain valid.
    // Could optionally trigger analytics/logging here if desired.
    return;
}
