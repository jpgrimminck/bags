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

// Cargar relaciones items-viajes desde items_trips.json y localStorage
export async function loadItemsTrips() {
    try {
        const response = await fetch('JSON/items_trips.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let itemsTripsData = await response.json();
        
        // Load saved itemsTrips changes from localStorage
        const savedItemsTrips = localStorage.getItem('itemsTrips');
        if (savedItemsTrips) {
            const savedData = JSON.parse(savedItemsTrips);
            // Merge: update existing and add new
            savedData.forEach(savedItem => {
                const existingIndex = itemsTripsData.findIndex(item => item.itemId === savedItem.itemId && item.tripId === savedItem.tripId);
                if (existingIndex >= 0) {
                    itemsTripsData[existingIndex] = savedItem;
                } else {
                    itemsTripsData.push(savedItem);
                }
            });
        }
        
        state.itemsTrips = itemsTripsData;
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
        
        // Load saved inventory changes from localStorage
        const savedInventory = localStorage.getItem('inventory');
        if (savedInventory) {
            const savedData = JSON.parse(savedInventory);
            // Merge: update existing items and add new ones
            savedData.forEach(savedItem => {
                const existingIndex = inventoryData.findIndex(item => item.id === savedItem.id);
                if (existingIndex >= 0) {
                    inventoryData[existingIndex] = savedItem;
                } else {
                    inventoryData.push(savedItem);
                }
            });
        }
        
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

// Save itemsTrips in localStorage to persist changes
export function saveItemsTrips() {
    localStorage.setItem('itemsTrips', JSON.stringify(state.itemsTrips));
}

// Save inventory in localStorage to persist changes
export function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(state.inventory));
}
