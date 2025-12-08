// --- CONFIGURACIÓN Y DATOS INICIALES ---

// Definición de Ubicaciones
let availableLocations = [
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

// Definición de Categorías
const itemCategories = [
    { id: 'ropa', name: 'Ropa', icon: '👕' },
    { id: 'abrigo', name: 'Abrigo', icon: '🧥' },
    { id: 'aseo', name: 'Aseo', icon: '🧴' },
    { id: 'electronica', name: 'Electrónica', icon: '🔌' },
    { id: 'otros', name: 'Otros', icon: '📦' }
];

// Definición de Familiares (se cargará desde family.json)
let familyMembers = [
    { id: 1, name: 'Papá', icon: '👨', type: 'persona' },
    { id: 2, name: 'Mamá', icon: '👩', type: 'persona' },
    { id: 3, name: 'Sebastián', icon: '👦', type: 'persona' },
    { id: 4, name: 'Elisa', icon: '👧', type: 'persona' },
    { id: 5, name: 'Casa', icon: '🏠', type: 'casa' }
];

// Definición de Mascotas (se cargará desde pets.json)
let pets = [];

// Bolsos de la familia (se cargará desde bags.json)
let bags = [];

// Inventario completo del viaje
let inventory = [];
