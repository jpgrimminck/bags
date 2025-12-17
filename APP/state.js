// Centralized initial state object for the app (copied from original app.js)
export const state = {
  // --- ESTADO DE LA APLICACIÓN ---
  currentTab: 'bolsos',

  // Estado de edición de bolsos e items
  editingBags: {}, // { bagId: true/false } - bolsos en modo edición
  editingItemId: null, // ID del item siendo editado

  // Estado de expansión de tarjetas (móvil)
  expandedBags: {}, // { bagId: true/false } - bolsos expandidos

  // Estado de bolsos bloqueados
  lockedBags: {}, // { bagId: true/false } - bolsos bloqueados

  // Estado del menú de configuración abierto
  openBagMenu: null, // bagId del menú abierto

  // Estado de edición de nombre de bolso
  editingBagName: null, // bagId del bolso cuyo nombre se está editando

  // Estado de creación de nuevo bolso
  creatingBagForMember: null, // nombre del familiar para el nuevo bolso
  newBagName: '', // nombre del nuevo bolso

  // Estado de modo quitar items
  removingFromBag: {}, // { bagId: true/false } - bolsos en modo quitar items

  // Configuración de visualización
  groupByCategory: false, // Agrupar items por categoría dentro de cada bolso

  // Variable para el término de búsqueda
  searchTerm: '',
  headerSearchOpen: false,
  tripFilterActive: null, // null = ninguno, número = id del viaje activo
  userDisabledFilter: false, // Si el usuario desactivó el filtro manualmente

  // Lista de todos los viajes
  allTrips: [],

  // Relación items-viajes-bolsos
  itemsTrips: [],
  currentTripId: null, // Se establecerá desde la URL o el viaje activo

  // Modo de asignación de items a bolso
  assignModeBagId: null, // ID del bolso al que se asignarán items
  assignModeActive: false, // Si estamos en modo asignación
  newlyAssignedItems: [], // IDs de items recién asignados (para destacar)
  pendingAssignItems: [], // IDs de items seleccionados temporalmente para agregar

  // Items seleccionados para agregar al viaje (cuando filtro activo)
  selectedItemsForTrip: [],

  // Estado para creación de nuevos items
  creatingItemForOwner: null, // nombre del familiar para el que se está creando item
  newItemText: '', // texto del nuevo item
  newItemMatches: [], // items que coinciden con el texto

  // Nuevos items creados (persistidos en localStorage)
  newItems: [],

  // Espacio centralizado para el gap entre tarjetas
  CARD_GAP: '1rem',

  // Flag usada para indicar que llegamos a `items.html` por un redirect desde otra página
  suppressFamilyCreateLinks: false,
  pendingCreateTargetFamily: null,
  pendingCreateBagIdFromUrl: null,

  // Variable global para el nombre del viaje
  currentTripName: '',

  // Data arrays
  availableLocations: [],
  itemCategories: [],
  inventory: [],
  bags: [],
  familyMembers: [],
  pets: []
};

// Helper to replace mutable root-level variables in legacy code if needed
export function attachToWindow() {
  // Attach state to window for backward-compatibility while migrating
  if (!window.__APP_STATE__) window.__APP_STATE__ = state;
  // Also expose top-level names for existing code paths that reference them directly
  Object.keys(state).forEach(k => { window[k] = state[k]; });
  // Expose CARD_GAP as constant
  window.CARD_GAP = state.CARD_GAP;
}
