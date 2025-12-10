// --- ESTADO DE LA APLICACIÓN ---

// Estado actual de la vista (por defecto, se sobrescribe en cada HTML)
let currentTab = 'bolsos';

// Estado de edición de bolsos e items
let editingBags = {}; // { bagId: true/false } - bolsos en modo edición
let editingItemId = null; // ID del item siendo editado

// Estado de expansión de tarjetas (móvil)
let expandedBags = {}; // { bagId: true/false } - bolsos expandidos

// Estado de bolsos bloqueados
let lockedBags = {}; // { bagId: true/false } - bolsos bloqueados

// Estado del menú de configuración abierto
let openBagMenu = null; // bagId del menú abierto

// Estado de edición de nombre de bolso
let editingBagName = null; // bagId del bolso cuyo nombre se está editando

// Estado de creación de nuevo bolso
let creatingBagForMember = null; // nombre del familiar para el nuevo bolso
let newBagName = ''; // nombre del nuevo bolso

// Estado de modo quitar items
let removingFromBag = {}; // { bagId: true/false } - bolsos en modo quitar items

// Configuración de visualización
let groupByCategory = false; // Agrupar items por categoría dentro de cada bolso

// Variable para el término de búsqueda
let searchTerm = '';
let headerSearchOpen = false;
let tripFilterActive = null; // null = ninguno, número = id del viaje activo
let userDisabledFilter = false; // Si el usuario desactivó el filtro manualmente

// Lista de todos los viajes
let allTrips = [];

// Relación items-viajes-bolsos
let itemsTrips = [];
let currentTripId = null; // Se establecerá desde la URL o el viaje activo

// Modo de asignación de items a bolso
let assignModeBagId = null; // ID del bolso al que se asignarán items
let assignModeActive = false; // Si estamos en modo asignación
let newlyAssignedItems = []; // IDs de items recién asignados (para destacar)
let pendingAssignItems = []; // IDs de items seleccionados temporalmente para agregar

// Items seleccionados para agregar al viaje (cuando filtro activo)
let selectedItemsForTrip = [];

// Estado para creación de nuevos items
let creatingItemForOwner = null; // nombre del familiar para el que se está creando item
let newItemText = ''; // texto del nuevo item
let newItemMatches = []; // items que coinciden con el texto

// Nuevos items creados (persistidos en localStorage)
let newItems = [];

/* Espacio centralizado para el gap entre tarjetas.
   Cambia este valor en un solo lugar para que se aplique en todos los dispositivos.
   Valor usado como fallback inline cuando el navegador no soporta `gap` en flex. */
const CARD_GAP = '1rem';
// Exponer la variable CSS para navegadores modernos: así cambiar CARD_GAP
// actualizará los gap definidos en CSS (via --card-gap).
try { document.documentElement.style.setProperty('--card-gap', CARD_GAP); } catch(e) { /* ignore */ }

// Flag usada para indicar que llegamos a `items.html` por un redirect desde otra página
// y que debemos suprimir ciertos enlaces/links específicos de modos (p. ej. "Crear Item para X").
let suppressFamilyCreateLinks = false;
// Family name to which we should surface the create card after a redirect
let pendingCreateTargetFamily = null;
// If user arrived with URL params for assign mode, store bagId to target after data loads
let pendingCreateBagIdFromUrl = null;

function applyInlineCardGapIfNeeded() {
    try {
        const grid = document.querySelector('.family-grid');
        const needFallback = document.documentElement.classList.contains('no-flex-gap') || (grid && getComputedStyle(grid).gap === '0px');
        if (!needFallback) return;
        document.querySelectorAll('.family-column').forEach(el => {
            el.style.marginBottom = CARD_GAP;
        });
    } catch (e) {
        // fall back silently
        console.warn('applyInlineCardGapIfNeeded error', e);
    }
}

// Normaliza la ruta del campo `photo` de un bolso.
// Acepta valores como `b1.jpeg`, `b1.jpg`, `b1.png`, URLs o rutas ya completas.
function normalizePhotoPath(photo) {
    if (!photo) return '';
    const trimmed = String(photo).trim();
    // If it's an absolute URL or data URI, keep it
    if (/^(https?:\/\/|data:)/i.test(trimmed)) return trimmed;
    // If it's already pointing into images/ or starts with /, keep as-is
    if (trimmed.startsWith('images/') || trimmed.startsWith('/')) return trimmed;
    // If it's a simple filename (b1.jpg, b2.jpeg, etc.) add images/bags/
    if (/^[\w0-9\-_.]+\.(jpe?g|png|svg)$/i.test(trimmed)) {
        return `images/bags/${trimmed}`;
    }
    // Fallback: return as provided
    return trimmed;
}

// Inicializar currentTripId y modo asignación desde la URL
function initCurrentTripId() {
    const urlParams = new URLSearchParams(window.location.search);
    const viajeParam = urlParams.get('viaje');
    const bolsoParam = urlParams.get('bolso');
    const modoParam = urlParams.get('modo');
    
    if (viajeParam) {
        currentTripId = parseInt(viajeParam);
    } else {
        // Si no hay parámetro, usar el primer viaje activo (se establecerá en loadTripName)
        currentTripId = 1;
    }
    
    // Modo asignación
    if (bolsoParam && modoParam === 'asignar') {
        assignModeBagId = parseInt(bolsoParam);
        assignModeActive = true;
        // Mark that we arrived with assign-mode via URL; later we'll target the corresponding family
        pendingCreateBagIdFromUrl = bolsoParam;
        suppressFamilyCreateLinks = true;
    }
    
    // Verificar si hay items recién asignados para destacar (desde sessionStorage)
    const storedHighlight = sessionStorage.getItem('highlightItems');
    if (storedHighlight && !assignModeActive) {
        newlyAssignedItems = JSON.parse(storedHighlight);
        // Limpiar sessionStorage después de cargar
        sessionStorage.removeItem('highlightItems');
        
        // Limpiar animación después de 2 segundos
        setTimeout(() => {
            newlyAssignedItems = [];
            render();
        }, 2000);
    }
}

// --- FUNCIONES DE UTILIDAD ---

// Obtener items de un bolso para el viaje actual
function getItemsForBag(bagId) {
    // Obtener relaciones de items para este bolso y viaje actual
    const relations = itemsTrips.filter(it => it.bagId === bagId && it.tripId === currentTripId);
    
    // Obtener los items correspondientes
    return relations.map(rel => {
        const item = inventory.find(i => i.id === rel.itemId);
        if (item) {
            return { ...item, checked: rel.checked, bag: rel.bagId };
        }
        return null;
    }).filter(i => i);
}

// Calcula dinámicamente a quién está asignado un bolso según sus items
function getBagAssignment(bagId) {
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
        const member = familyMembers.find(m => m.id === ownerId);
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


// --- LÓGICA DE RENDERIZADO ---

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    
    // Actualizar estadísticas del header
    updateHeaderStats();
    
    // Actualizar contador de cambios locales
    updateLocalChangesCounter();

    if (currentTab === 'bolsos') renderBolsosView(app);
    else if (currentTab === 'zonas') renderZonasView(app);
    else if (currentTab === 'inventario') renderInventarioView(app);
    else if (currentTab === 'config') renderConfigView(app);
}

// VISTA 1: BOLSOS
function renderBolsosView(container) {
    // Contenedor de bolsos por familiar
    container.innerHTML += `<div id="bagsContainer"></div>`;

    // Renderizar bolsos
    renderBagsContent();
}

function renderBagsContent() {
    const bagsContainer = document.getElementById('bagsContainer');
    if (!bagsContainer) return;
    
        // Obtener IDs de bolsos que tienen items en el viaje actual
        const bagsWithItemsInTrip = [...new Set(
            itemsTrips.filter(it => it.tripId === currentTripId).map(it => it.bagId)
        )];
    
        // Filtrar solo bolsos principales que tienen items en este viaje
        const mainBags = bags.filter(b => !b.parentId && bagsWithItemsInTrip.includes(b.id));

    // Agrupar bolsos por "firma" de dueños (conjunto único de owners)
    const bagGroups = {};
    
    mainBags.forEach(bag => {
        const assignment = getBagAssignment(bag.id);
        // Crear una clave única basada en los nombres ordenados
        const key = assignment.names.length > 0 
            ? assignment.names.sort().join('|') 
            : '_sin_items_';
        
        if (!bagGroups[key]) {
            bagGroups[key] = {
                owners: assignment.names,
                ownerIds: assignment.names.map(name => {
                    const member = familyMembers.find(m => m.name === name);
                    return member ? member.id : null;
                }).filter(id => id !== null),
                icons: assignment.names.map(name => {
                    const member = familyMembers.find(m => m.name === name);
                    return member ? member.icon : '📦';
                }),
                bags: []
            };
        }
        bagGroups[key].bags.push(bag);
    });

    // Contenedor principal
    let gridHTML = '<div class="family-grid">';
    
    // Renderizar cada grupo
    Object.keys(bagGroups).forEach(key => {
        const group = bagGroups[key];
        if (group.bags.length === 0) return;
        
        const ownerCount = group.owners.length;
        const bagCount = group.bags.length;
        
        // Construir título
        let sectionTitle = '';
        let iconsHTML = '';
        
            if (ownerCount === 0) {
            sectionTitle = bagCount === 1 ? 'BOLSO SIN ITEMS' : 'BOLSOS SIN ITEMS';
            iconsHTML = '<span class="text-3xl text-4xl">📦</span>';
        } else if (ownerCount === 1) {
            const name = group.owners[0];
            if (name === 'Papá') {
                sectionTitle = bagCount === 1 ? 'BOLSO DEL PAPÁ' : 'BOLSOS DEL PAPÁ';
            } else if (name === 'Mamá') {
                sectionTitle = bagCount === 1 ? 'BOLSO DE LA MAMÁ' : 'BOLSOS DE LA MAMÁ';
            } else {
                sectionTitle = bagCount === 1 ? `BOLSO DE ${name.toUpperCase()}` : `BOLSOS DE ${name.toUpperCase()}`;
            }
            iconsHTML = `<span class="text-3xl text-4xl">${group.icons[0]}</span>`;
        } else {
            // 2 o más dueños - categorizar cada uno
            const ownerData = group.ownerIds.map((id, idx) => {
                const fam = familyMembers.find(f => f.id === id);
                return {
                    id: id,
                    name: group.owners[idx],
                    category: fam ? fam.category : null
                };
            });
            
            const padres = ownerData.filter(o => o.category === 'padre');
            const hijos = ownerData.filter(o => o.category === 'hijo');
            
            const padreCount = padres.length;
            const hijoCount = hijos.length;
            
            let titleParts = [];
            
            if (padreCount >= 2) {
                // 2+ padres = "PAPÁS"
                titleParts.push('PAPÁS');
            } else if (padreCount === 1) {
                // 1 padre = nombre individual
                titleParts.push(padres[0].name.toUpperCase());
            }
            
            if (hijoCount >= 2) {
                // 2+ hijos = "HERMANOS"
                titleParts.push('HERMANOS');
            } else if (hijoCount === 1) {
                // 1 hijo = nombre individual
                titleParts.push(hijos[0].name.toUpperCase());
            }
            
            // Construir el título final
            if (titleParts.length === 1) {
                sectionTitle = bagCount === 1 ? `BOLSO DE ${titleParts[0]}` : `BOLSOS DE ${titleParts[0]}`;
            } else if (titleParts[0] === 'PAPÁS' && titleParts[1] === 'HERMANOS') {
                // Caso especial: todos (papás + hermanos)
                sectionTitle = bagCount === 1 ? 'BOLSO FAMILIAR' : 'BOLSOS FAMILIARES';
            } else {
                const namesText = titleParts.join(' Y ');
                sectionTitle = bagCount === 1 ? `BOLSO DE ${namesText}` : `BOLSOS DE ${namesText}`;
            }
            
            iconsHTML = group.icons.map(icon => `<span class="text-3xl text-4xl">${icon}</span>`).join('');
        }
        
        // Cada grupo es una columna
        gridHTML += `
        <div class="family-column mb-6">
            <h3 class="sticky top-[52px] z-20 bg-gray-100 text-xl text-2xl font-bold text-gray-700 py-1.5 px-1 -mx-1 flex flex-wrap items-center gap-x-2 gap-y-0 border-b static bg-transparent py-0 px-0 mx-0 mb-3 pb-2">
                <span class="flex items-center gap-1 flex-shrink-0">${iconsHTML}</span>
                <span class="whitespace-nowrap">${sectionTitle}</span>
            </h3>
                <div class="desktop-grid-x">
        `;

        group.bags.forEach(bag => {
            // Encontrar sub-bolsos
            const subBags = bags.filter(b => b.parentId === bag.id);
            const subBagIds = [bag.id, ...subBags.map(sb => sb.id)];

            // Filtrar items de este bolso y sus sub-bolsos usando la relación items_trips
            let bagItems = [];
            subBagIds.forEach(bid => {
                bagItems = bagItems.concat(getItemsForBag(bid));
            });
            
            const checkedCount = bagItems.filter(i => i.checked).length;
            const totalCount = bagItems.length;
            const bagProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

            const completeBorder = checkedCount === totalCount && totalCount > 0 ? 'ring-2 ring-green-400' : '';

            const isEditMode = editingBags[bag.id] || false;
            const isExpanded = expandedBags[bag.id] !== false;
            const expandedClass = isExpanded ? '' : 'hidden';
            const isLocked = lockedBags[bag.id] || false;
            const isMenuOpen = openBagMenu === bag.id;
            const isEditingName = editingBagName === bag.id;
            const isRemovingMode = removingFromBag[bag.id] || false;
            
            gridHTML += `
                        <div class="bg-white rounded-xl shadow bag-card ${completeBorder} relative ${isLocked ? 'bag-locked-border' : ''} mt-0.5" id="bag-card-${bag.id}">
                <!-- Header sticky del bolso -->
                <div class="sticky top-[96px] static bg-white rounded-t-xl z-10 p-4 pb-2 cursor-pointer cursor-default" onclick="toggleBagExpand('${bag.id}')">
                    <!-- Título e ícono -->
                    <div class="flex justify-between items-center mb-2 bag-title-area">
                        <div class="flex items-center">
                            <img src="${bag.photo || 'bag-default.jpg'}" alt="${bag.name}" class="w-12 h-12 w-14 h-14 rounded-lg object-cover mr-3">
                            <div>
                                ${isEditingName ? `
                                <input type="text" id="edit-bag-name-input" value="${bag.name}" 
                                    class="font-bold text-lg text-xl leading-tight border-b-2 border-blue-500 outline-none bg-transparent w-full"
                                    onclick="event.stopPropagation()"
                                    onkeydown="if(event.key==='Enter'){saveBagName('${bag.id}', event);} if(event.key==='Escape'){cancelEditBagName(event);}">
                                <div class="flex gap-2 mt-1">
                                    <button onclick="saveBagName('${bag.id}', event)" class="text-xs bg-blue-600 text-white px-2 py-1 rounded">Modificar</button>
                                    <button onclick="cancelEditBagName(event)" class="text-xs text-gray-500 px-2 py-1">Cancelar</button>
                                </div>
                                ` : `<h3 class="font-bold text-lg text-xl leading-tight">${bag.name}</h3>`}
                            </div>
                        </div>
                        <!-- Botones de acción -->
                        <div class="flex items-center gap-2 flex-shrink-0">
                            ${isLocked ? `
                                <button onclick="event.stopPropagation(); showUnlockModal('${bag.id}')" 
                                    class="px-3 py-1.5 flex items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium transition-colors hover:bg-green-600">
                                    <i class="fa-solid fa-lock mr-1"></i> <span class="font-medium text-sm">Cerrado</span>
                                </button>
                                ` : isRemovingMode ? `
                                <!-- Modo quitar items: botón Listo -->
                                <button onclick="event.stopPropagation(); cancelRemovingItems('${bag.id}')" 
                                    class="px-3 py-1.5 flex items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium transition-colors hover:bg-green-600">
                                    <i class="fa-solid fa-check mr-1"></i> <span class="font-medium text-sm">Listo</span>
                                </button>
                            ` : `
                                <!-- Modo normal: botones lápiz y + Item (pencil left, plus right) -->
                                <!-- Botón Editar con menú -->
                                <div class="relative">
                                    <button onclick="event.stopPropagation(); toggleBagEditMenu('${bag.id}')" 
                                        class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                                        <i class="fa-solid fa-pencil"></i>
                                    </button>
                                    <!-- Menú desplegable -->
                                    <div id="bag-edit-menu-${bag.id}" class="hidden absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[160px]">
                                        <button onclick="event.stopPropagation(); startRemovingItems('${bag.id}')" 
                                            class="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-red-600">
                                            <i class="fa-solid fa-trash"></i> Quitar Items
                                        </button>
                                        <button onclick="event.stopPropagation(); toggleBagLock('${bag.id}')" 
                                            class="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-yellow-600">
                                            <i class="fa-solid fa-lock"></i> Cerrar Bolso
                                        </button>
                                    </div>
                                </div>
                                <a href="items.html?viaje=${currentTripId}&bolso=${bag.id}&modo=asignar" 
                                    onclick="event.stopPropagation();"
                                    class="px-3 py-1.5 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-medium transition-colors hover:bg-blue-600">
                                    <i class="fa-solid fa-plus mr-1"></i> Item
                                </a>
                                ${checkedCount === totalCount && totalCount > 0 && !isEditMode ? '<span class="text-green-500 text-sm font-bold"><i class="fa-solid fa-check-circle"></i></span>' : ''}
                            `}
                        </div>
                    </div>
                    
                    <!-- Barra de Progreso -->
                    <div class="flex items-center gap-2">
                        <div class="flex-1 bg-gray-200 rounded-full h-3">
                            <div id="bag-progress-${bag.id}" class="bg-blue-500 h-3 rounded-full progress-transition" style="width: ${bagProgress}%"></div>
                        </div>
                        <span id="bag-ratio-${bag.id}" class="text-sm font-bold text-blue-600">${checkedCount}/${totalCount}</span>
                    </div>
                    
                    <!-- Flecha indicadora -->
                    ${!isExpanded ? '<div class="flex justify-center mt-2"><i class="fa-solid fa-chevron-down text-gray-300 text-xs"></i></div>' : ''}
                </div>

                <!-- Contenido expandible -->
                <div class="px-4 pb-4 ${expandedClass} block" id="bag-content-${bag.id}">
                    ${isEditMode ? `
                    <button onclick="event.stopPropagation(); openModalForBag('${bag.id}')" 
                        class="w-full mb-3 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 transition-colors">
                        <i class="fa-solid fa-plus"></i> Nuevo item
                    </button>
                    ` : ''}
                    <ul class="space-y-1" id="bag-items-${bag.id}">
                        ${bagItems.length > 0 ? (() => {
                            let html = '';
                            
                            // Agrupar items por dueño
                            const itemsByOwner = {};
                            bagItems.forEach(item => {
                                const ownerId = item.owner || '_sin_dueno_';
                                if (!itemsByOwner[ownerId]) itemsByOwner[ownerId] = [];
                                itemsByOwner[ownerId].push(item);
                            });
                            
                            // Ordenar dueños por cantidad de items (menor a mayor)
                            const sortedOwners = Object.keys(itemsByOwner).sort((a, b) => 
                                itemsByOwner[a].length - itemsByOwner[b].length
                            );
                            
                            sortedOwners.forEach(ownerId => {
                                const ownerItems = itemsByOwner[ownerId];
                                
                                // Obtener info del dueño
                                let ownerIcon = '';
                                let ownerName = '';
                                let ownerLabel = '';
                                
                                if (ownerId === '_sin_dueno_') {
                                    ownerIcon = '📦';
                                    ownerLabel = 'Items sin dueño';
                                } else {
                                    const fam = familyMembers.find(f => f.id === parseInt(ownerId) || f.id === ownerId);
                                    const pet = pets.find(p => p.id === parseInt(ownerId) || p.id === ownerId);
                                    if (fam) {
                                        ownerIcon = fam.icon;
                                        ownerName = fam.name;
                                        // Determinar artículo
                                        if (ownerName === 'Papá') {
                                            ownerLabel = 'Items del Papá';
                                        } else if (ownerName === 'Mamá') {
                                            ownerLabel = 'Items de la Mamá';
                                        } else {
                                            ownerLabel = 'Items de ' + ownerName;
                                        }
                                    } else if (pet) {
                                        ownerIcon = pet.icon;
                                        ownerName = pet.name;
                                        ownerLabel = 'Items de ' + ownerName;
                                    }
                                }
                                
                                // Header del grupo de dueño (solo si hay más de 1 dueño)
                                if (sortedOwners.length > 1) {
                                    html += '<li class="sticky top-[195px] static z-[5] bg-white text-xs text-gray-400 pt-3 pb-1 flex items-center gap-1.5 -mx-4 px-4">' +
                                        '<span class="text-sm">' + ownerIcon + '</span>' +
                                        '<span>' + ownerLabel + '</span>' +
                                    '</li>';
                                }
                                
                                // Items de este dueño
                                if (groupByCategory) {
                                    const itemsByCategory = {};
                                    itemCategories.forEach(cat => itemsByCategory[cat.id] = []);
                                    ownerItems.forEach(item => {
                                        const cat = item.category || 'otros';
                                        if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                                        itemsByCategory[cat].push(item);
                                    });
                                    
                                    itemCategories.forEach(cat => {
                                        const catItems = itemsByCategory[cat.id];
                                        if (catItems && catItems.length > 0) {
                                            html += '<li class="text-xs font-bold text-gray-500 pt-2 pb-1 border-b border-gray-100 ml-4">' + cat.icon + ' ' + cat.name + '</li>';
                                            catItems.sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach(item => {
                                                const itemBag = bags.find(b => b.id === item.bag);
                                                const isSubBag = itemBag.id !== bag.id;
                                                html += createItemRow(item, isSubBag, itemBag, isEditMode, bag.id, isRemovingMode);
                                            });
                                        }
                                    });
                                } else {
                                    ownerItems.sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach(item => {
                                        const itemBag = bags.find(b => b.id === item.bag);
                                        const isSubBag = itemBag.id !== bag.id;
                                        html += createItemRow(item, isSubBag, itemBag, isEditMode, bag.id, isRemovingMode);
                                    });
                                }
                            });
                            
                            return html;
                        })() : '<li class="text-gray-400 text-sm text-center py-4">Sin items</li>'}
                    </ul>
                </div>
            </div>`;
        });

        gridHTML += '</div></div>';
    });
    
    gridHTML += '</div>';
    bagsContainer.innerHTML = gridHTML;
    // Aplicar margen inline si es necesario (fallback para navegadores sin soporte gap en flex)
    applyInlineCardGapIfNeeded();
}

// VISTA 2: ZONAS
function renderZonasView(container) {
    container.innerHTML += `
        <div class="mb-6">
            <h2 class="text-3xl font-bold text-gray-800">🏠 Recolección por Zona</h2>
            <p class="text-sm text-gray-500">Recorre la casa una sola vez.</p>
        </div>`;

    const locations = [...new Set(inventory.map(i => i.loc))].sort();

    if(locations.includes('Comprar')) {
        locations.splice(locations.indexOf('Comprar'), 1);
        locations.unshift('Comprar');
    }

    let gridHTML = '<div class="desktop-grid-x">';

    locations.forEach(loc => {
        const locItems = inventory.filter(i => i.loc === loc);
        const allChecked = locItems.length > 0 && locItems.every(i => i.checked);
        const checkedCount = locItems.filter(i => i.checked).length;
        const locColor = loc === 'Comprar' ? 'text-red-600' : 'text-gray-800';
        const locIcon = loc === 'Comprar' ? '<i class="fa-solid fa-cart-shopping"></i>' : '<i class="fa-solid fa-location-dot"></i>';
        const completeBorder = allChecked ? 'ring-2 ring-green-400' : '';

        const itemsHTML = locItems.map(item => {
            const targetBag = bags.find(b => b.id === item.bag);
            return createItemRow(item, true, targetBag);
        }).join('');

        const html = `
        <div class="bg-white rounded-xl shadow overflow-hidden ${completeBorder}">
            <div class="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold text-lg ${locColor}">${locIcon} ${loc}</h3>
                <div class="text-right">
                    <span class="text-xs text-gray-500">${checkedCount}/${locItems.length}</span>
                    ${allChecked ? '<div class="text-green-500 text-xs font-bold"><i class="fa-solid fa-check"></i> Lista</div>' : ''}
                </div>
            </div>
            <ul class="p-3 space-y-1">
                ${itemsHTML || '<li class="text-gray-400 text-sm text-center py-4">Sin items</li>'}
            </ul>
        </div>`;
        gridHTML += html;
    });
    
    gridHTML += '</div>';
    container.innerHTML += gridHTML;
}

// VISTA 3: ITEMS
function renderInventarioView(container) {
     // Si estamos en modo asignación, mostrar header especial
     const assignModeBag = assignModeActive ? bags.find(b => b.id === assignModeBagId) : null;
     
     // Activar filtro del viaje actual por defecto si no hay filtro activo y no fue desactivado manualmente
     if (!assignModeActive && currentTripId && tripFilterActive === null && !userDisabledFilter) {
         tripFilterActive = currentTripId;
     }
     
     // Obtener dueños actuales del bolso (basado en items ya asignados)
     let bagOwners = [];
     let bagOwnerNames = [];
     if (assignModeActive && assignModeBagId) {
         const bagAssignment = getBagAssignment(assignModeBagId);
         bagOwnerNames = bagAssignment.names || [];
         bagOwners = bagOwnerNames.map(name => familyMembers.find(m => m.name === name)).filter(m => m);
     }
     
     const itemsByFamily = {};
     
     // Crear categorías para miembros tipo persona y mascota
     familyMembers.filter(m => m.type === 'persona' || m.type === 'mascota').forEach(member => {
         itemsByFamily[member.name] = [];
     });
     // Agregar Casa como categoría separada
     itemsByFamily['Casa'] = [];
     
     inventory.forEach(item => {
         // Usar owner para determinar el dueño del item
         const ownerMember = familyMembers.find(m => m.id === item.owner);
         if (ownerMember) {
             if (ownerMember.type === 'casa') {
                 itemsByFamily['Casa'].push(item);
             } else if (itemsByFamily[ownerMember.name]) {
                 itemsByFamily[ownerMember.name].push(item);
             } else {
                 itemsByFamily['Casa'].push(item);
             }
         } else {
             itemsByFamily['Casa'].push(item);
         }
     });
     
     // Obtener IDs de items ya asignados a este viaje
     const assignedItemIds = itemsTrips
         .filter(it => it.tripId === currentTripId)
         .map(it => it.itemId);
     
     let familyGroupsHTML = '';
     
     // Ordenar: primero personas, luego mascotas, luego Casa
     let orderedKeys = [
         ...familyMembers.filter(m => m.type === 'persona').map(m => m.name),
         ...familyMembers.filter(m => m.type === 'mascota').map(m => m.name),
         'Casa'
     ];
     
     // En modo asignación, reordenar para mostrar primero los dueños del bolso
     let primaryOwners = [];
     let secondaryOwners = [];
     
     if (assignModeActive && bagOwnerNames.length > 0) {
         primaryOwners = orderedKeys.filter(name => bagOwnerNames.includes(name));
         secondaryOwners = orderedKeys.filter(name => !bagOwnerNames.includes(name));
     } else {
         primaryOwners = orderedKeys;
     }
     
     // Función para renderizar una sección de familiar
     const renderFamilySection = (familyName, showCreateButton = false) => {
         const items = itemsByFamily[familyName];
        if (assignModeActive && (!items || items.length === 0)) {
            // Si se estableció supresión de enlaces de creación (por redirect), no renderizar el bloque
            if (suppressFamilyCreateLinks) {
                return '';
            }
            // Si no hay items pero estamos en modo asignación, mostrar solo el botón crear
            if (assignModeActive) {
                const member = familyMembers.find(m => m.name === familyName);
                const memberIcon = member ? member.icon : '🏠';
                const memberId = member ? member.id : null;
                
                let sectionTitle = `ITEMS DE ${familyName.toUpperCase()}`;
                if (familyName === 'Papá') sectionTitle = 'ITEMS DEL PAPÁ';
                if (familyName === 'Mamá') sectionTitle = 'ITEMS DE LA MAMÁ';
                if (familyName === 'Casa') sectionTitle = 'ITEMS DE LA CASA';
                
                return `
                <div class="mb-6">
                   <h3 class="sticky top-[115px] z-20 bg-gray-100 text-lg font-bold text-gray-700 py-2 px-1 -mx-1 flex items-center gap-2 static bg-transparent py-0 px-0 mx-0 mb-3">
                        <span class="text-2xl">${memberIcon}</span> ${sectionTitle}
                        <span class="text-sm font-normal text-gray-400">(0)</span>
                    </h3>
                    <div class="bg-gray-50 rounded-lg p-4 text-center">
                        <p class="text-gray-500 mb-3">No hay items disponibles.</p>
                        <button onclick="openCreateItemForOwner(${memberId}, '${familyName}')" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                            <i class="fa-solid fa-plus mr-2"></i>Crear Item
                        </button>
                    </div>
                </div>`;
            }
            return '';
        }
         
         const member = familyMembers.find(m => m.name === familyName);
         const memberIcon = member ? member.icon : '🏠';
         const memberId = member ? member.id : null;
         
         // En modo asignación, filtrar solo items NO asignados al viaje
         let displayItems = items;
         if (assignModeActive) {
             displayItems = items.filter(item => !assignedItemIds.includes(item.id) || pendingAssignItems.includes(item.id));
         }
         
         const sortedItems = [...displayItems].sort((a, b) => a.name.localeCompare(b.name, 'es'));
         
         // Crear tarjeta de creación
         let createCardHTML = '';
         if (!assignModeActive) {
             if (creatingItemForOwner === familyName) {
                 const borderColor = newItemMatches.length === 0 ? 'border-blue-500' : 'border-red-500';
                 const showCreateButton = newItemMatches.length === 0 && newItemText.trim();
                 createCardHTML = `
                 <div class="bg-white rounded-lg shadow p-3 border-2 ${borderColor} flex flex-col gap-2 create-item-card" style="min-height: 52px;">
                     <input id="create-input-${familyName}" type="text" value="${newItemText}" oninput="updateNewItemText(this.value)" onkeydown="if(event.key==='Enter'){createNewItem();}else if(event.key==='Escape'){cancelCreateItem();}" 
                         class="text-sm font-medium text-gray-800 border-none outline-none bg-transparent" placeholder="Nombre del item" autofocus>
                     <div class="flex justify-between items-center">
                         ${showCreateButton ? `<button onclick="createNewItem()" class="text-xs bg-blue-600 text-white px-2 py-1 rounded">Crear</button>` : ''}
                     </div>
                 </div>
                 `;
             } else {
                 createCardHTML = `
                 <div class="bg-blue-600 rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer flex justify-center items-center" style="min-height: 52px;" onclick="startCreateItem('${familyName}')">
                     <span class="text-sm font-medium text-white">Crear</span>
                 </div>
                 `;
             }
         }
         
         // Verificar si todos los items del familiar ya están asignados
         const allItemsAssigned = assignModeActive && displayItems.length === 0;
         
         let sectionTitle = `ITEMS DE ${familyName.toUpperCase()}`;
         if (familyName === 'Papá') sectionTitle = 'ITEMS DEL PAPÁ';
         if (familyName === 'Mamá') sectionTitle = 'ITEMS DE LA MAMÁ';
         if (familyName === 'Casa') sectionTitle = 'ITEMS DE LA CASA';
         
         // Contador: en modo asignación mostrar items disponibles, sino total
         const itemCount = assignModeActive ? displayItems.length : items.length;
         
         return `
         <div class="mb-6">
             <h3 class="sticky top-[115px] z-20 bg-gray-100 text-lg font-bold text-gray-700 py-2 px-1 -mx-1 flex items-center gap-2 static bg-transparent py-0 px-0 mx-0 mb-3">
                 <span class="text-2xl">${memberIcon}</span> ${sectionTitle}
                 <span class="text-sm font-normal text-gray-400">(${itemCount})</span>
             </h3>
             ${allItemsAssigned ? `
             <div class="bg-gray-50 rounded-lg p-4 text-center">
                 <p class="text-gray-500 mb-3"><i class="fa-solid fa-check-circle text-green-500 mr-2"></i>Este familiar ya tiene todos sus items asignados.</p>
                 <button onclick="openCreateItemForOwner(${memberId}, '${familyName}')" 
                     class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                     <i class="fa-solid fa-plus mr-2"></i>Crear Item
                 </button>
             </div>
             ` : `
                 <div class="desktop-grid-x items-grid" onclick="${creatingItemForOwner === familyName ? `if(!event.target.closest('.create-item-card')) cancelCreateItem();` : ''}">
                 ${sortedItems.map(item => {
                     const isAssigned = assignedItemIds.includes(item.id);
                     const isFilterActive = tripFilterActive !== null || assignModeActive;
                     const isHighlighted = creatingItemForOwner === familyName && newItemMatches.includes(item);
                     
                     // Determinar estilo y acción según modo
                     let cardBg, clickAction, cursorClass, rightIcon;
                     
                     if (assignModeActive) {
                         // Modo asignación a bolso
                         const isPendingAssign = pendingAssignItems.includes(item.id);
                         if (isPendingAssign) {
                             // Seleccionado temporalmente (puede deseleccionarse)
                             cardBg = 'bg-blue-600 border-2 border-blue-600';
                             rightIcon = '<i class="fa-solid fa-suitcase text-white text-xs flex-shrink-0"></i>';
                             clickAction = `onclick="togglePendingItem(${item.id})"`;
                             cursorClass = 'cursor-pointer hover:bg-blue-700';
                        } else {
                            // No asignado, disponible para seleccionar
                            // Mantener el fondo original (blanco) y solo mostrar borde rojo
                            cardBg = 'bg-white border-2 border-red-400';
                            rightIcon = '';
                            clickAction = `onclick="togglePendingItem(${item.id})"`;
                            cursorClass = 'cursor-pointer';
                        }
                     } else if (tripFilterActive === 1) {
                         // Modo selección para viaje Algarrobo
                         const isSelected = selectedItemsForTrip.includes(item.id);
                         const isAssigned = assignedItemIds.includes(item.id);
                         if (isSelected) {
                             cardBg = 'bg-green-500 border-2 border-green-500';
                             rightIcon = '<i class="fa-solid fa-check text-white text-xs flex-shrink-0"></i>';
                             clickAction = `onclick="toggleSelectedItem(${item.id})"`;
                             cursorClass = 'cursor-pointer hover:bg-green-600';
                         } else {
                             cardBg = 'bg-white border border-gray-300';
                             rightIcon = isAssigned ? '<i class="fa-solid fa-suitcase text-blue-500 text-xs flex-shrink-0"></i>' : '';
                             clickAction = `onclick="toggleSelectedItem(${item.id})"`;
                             cursorClass = 'cursor-pointer hover:bg-gray-100';
                         }
                     } else if (isFilterActive) {
                         // Modo filtro de viaje (antiguo)
                         const hasBag = item.bag ? true : false;
                         // Si no tiene bolso, mostrar borde rojo pero conservar fondo original
                         cardBg = hasBag ? 'bg-white border border-transparent' : 'bg-white border border-red-200';
                         rightIcon = hasBag ? '<i class="fa-solid fa-suitcase text-blue-500 text-xs flex-shrink-0"></i>' : '';
                         clickAction = !hasBag ? `onclick="showBagSelector(${item.id}, '${familyName}')"` : '';
                         cursorClass = !hasBag ? 'cursor-pointer' : '';
                     } else {
                         cardBg = 'bg-white border border-transparent';
                         rightIcon = '';
                         clickAction = '';
                         cursorClass = '';
                     }
                     
                     if (isHighlighted) {
                         cardBg = 'bg-yellow-200 border-2 border-yellow-400';
                     }
                     
                     const textColor = (assignModeActive && pendingAssignItems.includes(item.id)) || (tripFilterActive === 1 && selectedItemsForTrip.includes(item.id)) ? 'text-white' : 'text-gray-800';
                     return `
                     <div class="${cardBg} rounded-lg shadow p-3 hover:shadow-md transition-shadow flex justify-between items-center gap-2 ${cursorClass}" style="min-height: 52px;" ${clickAction}>
                         <span class="text-sm font-medium ${textColor} text-left truncate">${item.name}</span>
                         ${rightIcon}
                     </div>
                 `}).join('')}
                 ${createCardHTML}
             </div>
             ${assignModeActive && !suppressFamilyCreateLinks ? `
             <div class="mt-3 text-center">
                 <button onclick="openCreateItemForOwner(${memberId}, '${familyName}')" 
                     class="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                     <i class="fa-solid fa-plus mr-1"></i>Crear Item para ${familyName}
                 </button>
             </div>
             ` : ''}
             `}
         </div>
         `;
     };
     
     // Renderizar dueños primarios
     primaryOwners.forEach(familyName => {
         familyGroupsHTML += renderFamilySection(familyName);
     });
     
     // Si hay dueños secundarios, agregar separador
     if (assignModeActive && secondaryOwners.length > 0) {
         familyGroupsHTML += `
         <div class="my-6 py-4 border-t-2 border-dashed border-gray-300">
             <p class="text-center text-gray-500 text-sm">
                 <i class="fa-solid fa-info-circle mr-2"></i>
                 Si quieres incluir items de otro familiar dentro de este bolso, márcalos aquí abajo.
             </p>
         </div>
         `;
         
         // Renderizar dueños secundarios
         secondaryOwners.forEach(familyName => {
             familyGroupsHTML += renderFamilySection(familyName);
         });
     }
     
     // Header especial para modo asignación
     let headerHTML = '';
     if (assignModeActive && assignModeBag) {
         // Construir texto del header según dueños
         let headerText = 'Agrega Items al bolso';
         let ownersIconsHTML = '';
         
         if (bagOwners.length === 1) {
             headerText = `Agrega Items al bolso de ${bagOwners[0].name}`;
             ownersIconsHTML = `<span class="text-2xl">${bagOwners[0].icon}</span>`;
         } else if (bagOwners.length === 2) {
             headerText = `Agrega Items al bolso de ${bagOwners[0].name} y ${bagOwners[1].name}`;
             ownersIconsHTML = `<span class="text-2xl">${bagOwners[0].icon}</span><span class="text-2xl">${bagOwners[1].icon}</span>`;
         } else if (bagOwners.length > 2) {
             const names = bagOwners.map(o => o.name).join(', ');
             headerText = `Agrega Items al bolso de ${names}`;
             ownersIconsHTML = bagOwners.map(o => `<span class="text-2xl">${o.icon}</span>`).join('');
         }
         
        headerHTML = `
         <div class="sticky top-[52px] z-30 bg-blue-600 text-white py-3 -mx-4 px-4 mb-4 rounded-lg shadow-lg">
             <div class="flex items-center gap-3">
                 <img src="${assignModeBag.photo || 'bag-default.jpg'}" class="w-10 h-10 rounded-lg object-cover">
                 <div class="flex-1">
                     <p class="font-bold text-lg flex items-center gap-2">${headerText} ${ownersIconsHTML}</p>
                 </div>
             </div>
         </div>`;
     } else {
         headerHTML = `
         <div class="sticky top-[65px] z-30 bg-gray-100 py-3 -mx-4 px-4 mb-4">
             <div class="flex flex-wrap gap-2 overflow-x-auto">
                 ${allTrips.map(trip => `
                     <button onclick="toggleTripFilter(${trip.id})" id="btn-trip-filter-${trip.id}" 
                         class="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap
                         ${tripFilterActive === trip.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                         <i class="fa-solid fa-suitcase"></i> ${trip.nombre}
                     </button>
                 `).join('')}
             </div>
         </div>`;
     }
     
    // Botón flotante para volver a bolsos (solo en modo asignación)
    let floatingButtonHTML = '';
    if (assignModeActive) {
        const pendingCount = pendingAssignItems.length;

        if (pendingCount > 0) {
            // Agrupar items pendientes por dueño
            const pendingByOwner = {};
            pendingAssignItems.forEach(itemId => {
                const item = inventory.find(i => i.id === itemId);
                if (item) {
                    const ownerMember = familyMembers.find(m => m.id === item.owner);
                    const ownerKey = ownerMember ? ownerMember.name : 'Casa';
                    if (!pendingByOwner[ownerKey]) {
                        pendingByOwner[ownerKey] = { count: 0, icon: ownerMember ? ownerMember.icon : '🏠' };
                    }
                    pendingByOwner[ownerKey].count++;
                }
            });

            // Separar entre dueños originales del bolso y nuevos
            const originalOwnerItems = [];
            const newOwnerItems = [];

            Object.keys(pendingByOwner).forEach(ownerName => {
                const data = pendingByOwner[ownerName];
                if (bagOwnerNames.includes(ownerName)) {
                    originalOwnerItems.push({ name: ownerName, ...data });
                } else {
                    newOwnerItems.push({ name: ownerName, ...data });
                }
            });

            // Construir texto y acción del botón
            const buttonAction = `onclick="${pendingCount > 0 ? 'confirmPendingItems()' : `window.location.href='index.html?viaje=${currentTripId}'` }"`;
            const buttonText = `<i class="fa-solid fa-arrow-left mr-2"></i> Agregar ${pendingCount} Item${pendingCount > 1 ? 's' : ''}`;
            const buttonStyle = pendingCount > 0
                ? 'bg-blue-600 border-2 border-blue-600 text-white hover:bg-blue-700'
                : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50';

            floatingButtonHTML = `
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40">
                <button ${buttonAction}
                    class="block w-full ${buttonStyle} text-center py-4 rounded-xl font-bold text-lg shadow-lg transition-colors">
                    ${buttonText}
                </button>
            </div>
            <div class="h-20"></div><!-- Espaciador para el botón flotante -->`;
        } else {
            // No hay items pendientes: mostrar botón para volver a la vista de bolsos
            const backAction = `onclick="window.location.href='index.html?viaje=${currentTripId}'"`;
            const backText = `<i class="fa-solid fa-arrow-left mr-2"></i> Volver a bolsos`;
            const backStyle = 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50';
            floatingButtonHTML = `
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40">
                <button ${backAction}
                    class="block w-full ${backStyle} text-center py-4 rounded-xl font-bold text-lg shadow-lg transition-colors">
                    ${backText}
                </button>
            </div>
            <div class="h-20"></div><!-- Espaciador para el botón flotante -->`;
        }
    } else if (tripFilterActive === 1 && selectedItemsForTrip.length > 0) {
        const selectedCount = selectedItemsForTrip.length;
        floatingButtonHTML = `
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40">
            <button onclick="showTripBagsModal()"
                class="block w-full bg-green-600 text-white text-center py-4 rounded-xl font-bold text-lg shadow-lg transition-colors hover:bg-green-700">
                <i class="fa-solid fa-plus mr-2"></i>Agregar al viaje (${selectedCount})
            </button>
        </div>
        <div class="h-20"></div><!-- Espaciador para el botón flotante -->`;
    }
     
     container.innerHTML += `
        ${headerHTML}
        ${familyGroupsHTML}
        ${floatingButtonHTML}
     `;
}

function showTripBagsModal() {
    // Obtener bolsos del viaje actual
    const tripBags = bags.filter(bag => {
        return itemsTrips.some(it => it.tripId === currentTripId && it.bagId == bag.id);
    });
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'tripBagsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-end items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-t-2xl rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hidden"></div>
            <h3 class="text-lg font-bold mb-4 text-gray-800">Seleccionar Bolso</h3>
            <p class="text-sm text-gray-600 mb-4">Elige un bolso para agregar los ${selectedItemsForTrip.length} items seleccionados.</p>
            
            <div class="space-y-3 mb-4">
                ${tripBags.map(bag => `
                    <button onclick="assignSelectedToBag(${bag.id})" 
                        class="w-full bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left">
                        <div class="flex items-center gap-3">
                            <img src="${bag.photo || 'bag-default.jpg'}" alt="${bag.name}" class="w-10 h-10 rounded-lg object-cover">
                            <div>
                                <h4 class="font-medium text-gray-800">${bag.name}</h4>
                                <p class="text-sm text-gray-500">${bag.type || 'bolso'}</p>
                            </div>
                        </div>
                    </button>
                `).join('')}
            </div>
            
            <button onclick="showUnusedBagsModal()" 
                class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors mb-3">
                <i class="fa-solid fa-plus mr-2"></i>Agregar Bolso
            </button>
            
            <button onclick="closeTripBagsModal()" 
                class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Cancelar
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeTripBagsModal() {
    const modal = document.getElementById('tripBagsModal');
    if (modal) modal.remove();
}

function assignSelectedToBag(bagId) {
    // Asignar los items seleccionados al bolso
    selectedItemsForTrip.forEach(itemId => {
        assignItemToBag(itemId, bagId);
    });
    selectedItemsForTrip = [];
    closeTripBagsModal();
    render();
}

function showUnusedBagsModal() {
    // Obtener bolsos no utilizados en el viaje
    const usedBagIds = itemsTrips.filter(it => it.tripId === currentTripId).map(it => it.bagId);
    const unusedBags = bags.filter(bag => !usedBagIds.includes(bag.id));
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'unusedBagsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-end items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-t-2xl rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hidden"></div>
            <h3 class="text-lg font-bold mb-4 text-gray-800">Agregar Bolso Existente</h3>
            <p class="text-sm text-gray-600 mb-4">Selecciona un bolso que aún no se usa en este viaje.</p>
            
            <div class="space-y-3 mb-4">
                ${unusedBags.length > 0 ? unusedBags.map(bag => `
                    <button onclick="addBagToTrip(${bag.id})" 
                        class="w-full bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left">
                        <div class="flex items-center gap-3">
                            <img src="${bag.photo || 'bag-default.jpg'}" alt="${bag.name}" class="w-10 h-10 rounded-lg object-cover">
                            <div>
                                <h4 class="font-medium text-gray-800">${bag.name}</h4>
                                <p class="text-sm text-gray-500">${bag.type || 'bolso'}</p>
                            </div>
                        </div>
                    </button>
                `).join('') : '<p class="text-gray-500 text-center py-4">No hay bolsos disponibles.</p>'}
            </div>
            
            <button onclick="showCreateBagModal()" 
                class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors mb-3">
                <i class="fa-solid fa-plus mr-2"></i>Crear Bolso
            </button>
            
            <button onclick="closeUnusedBagsModal()" 
                class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Cancelar
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeUnusedBagsModal() {
    const modal = document.getElementById('unusedBagsModal');
    if (modal) modal.remove();
}

function addBagToTrip(bagId) {
    // Agregar el bolso al viaje (sin items por ahora)
    // Como no hay items asignados, solo cerrar modales
    closeUnusedBagsModal();
    closeTripBagsModal();
    // Podríamos redirigir a asignar items al bolso, pero por ahora solo cerrar
}

function showCreateBagModal() {
    // Crear modal para crear nuevo bolso
    const modal = document.createElement('div');
    modal.id = 'createBagModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-end items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-t-2xl rounded-lg p-6 w-full max-w-sm">
            <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hidden"></div>
            <h3 class="text-lg font-bold mb-4 text-gray-800">Crear Nuevo Bolso</h3>
            
            <label class="block text-sm font-bold text-gray-700 mb-2">Nombre del bolso</label>
            <input type="text" id="newBagNameInput" placeholder="Ej. Bolso Playa" 
                class="w-full border border-gray-300 p-3 rounded-lg mb-4 text-base">
            
            <div class="flex gap-3">
                <button onclick="createNewBag()" 
                    class="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
                    Crear
                </button>
                <button onclick="closeCreateBagModal()" 
                    class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // Focus en input
    setTimeout(() => {
        const input = document.getElementById('newBagNameInput');
        if (input) input.focus();
    }, 100);
}

function closeCreateBagModal() {
    const modal = document.getElementById('createBagModal');
    if (modal) modal.remove();
}

function createNewBag() {
    const name = document.getElementById('newBagNameInput').value.trim();
    if (!name) {
        alert('Por favor ingresa un nombre para el bolso.');
        return;
    }
    
    // Crear nuevo bolso
    const newId = Math.max(...bags.map(b => b.id)) + 1;
    const newBag = {
        id: newId,
        name: name,
        photo: 'bag-default.jpg',
        type: 'bolso'
    };
    bags.push(newBag);
    
    // Guardar en localStorage o JSON (pero como quitamos localStorage, quizás no guardar)
    // Por ahora, solo agregar al array
    
    closeCreateBagModal();
    closeUnusedBagsModal();
    closeTripBagsModal();
    
    // Asignar los items seleccionados al nuevo bolso
    selectedItemsForTrip.forEach(itemId => {
        assignItemToBag(itemId, newId);
    });
    selectedItemsForTrip = [];
    render();
}

// VISTA 4: CONFIGURACIÓN
function renderConfigView(container) {
    container.innerHTML += `
        <div class="mb-6">
            <h2 class="text-2xl text-3xl font-bold text-gray-800">⚙️ Configuración</h2>
            <p class="text-sm text-gray-500">Gestiona bolsos, capacidades y asignaciones.</p>
        </div>

        <!-- Opciones de Visualización -->
        <div class="bg-white rounded-xl shadow p-4 mb-6">
            <h3 class="font-bold text-lg mb-3"><i class="fa-solid fa-eye"></i> Visualización</h3>
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium text-gray-800">Agrupar por categoría</p>
                    <p class="text-sm text-gray-500">Organiza los items por tipo dentro de cada bolso</p>
                </div>
                <button onclick="toggleGroupByCategory()" class="relative w-14 h-8 rounded-full transition-colors ${groupByCategory ? 'bg-green-500' : 'bg-gray-300'}">
                    <span class="absolute top-1 ${groupByCategory ? 'right-1' : 'left-1'} w-6 h-6 bg-white rounded-full shadow transition-all"></span>
                </button>
            </div>
        </div>

        <!-- Invitar Familiar -->
        <div class="bg-white rounded-xl shadow p-4 mb-6">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg"><i class="fa-solid fa-user-plus"></i> Invitar Familiar</h3>
                    <p class="text-sm text-gray-500">Comparte el viaje con tu familia</p>
                </div>
                <button onclick="inviteUser()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                    <i class="fa-solid fa-paper-plane"></i> Invitar
                </button>
            </div>
        </div>

        <!-- Gestión de Familiares -->
        <div class="bg-white rounded-xl shadow p-4 mb-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg"><i class="fa-solid fa-users"></i> Familiares</h3>
                <button onclick="openFamilyModal()" class="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                    <i class="fa-solid fa-plus"></i> Nuevo
                </button>
            </div>
            <div class="desktop-grid-x gap-3">
                ${familyMembers.filter(m => m.type === 'persona').map(member => `
                    <div class="border rounded-lg p-3 flex items-center justify-between bg-gray-50">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${member.icon}</span>
                            <span class="font-medium text-sm">${member.name}</span>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="editFamilyMember(${member.id})" class="text-blue-500 hover:text-blue-700 p-1"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteFamilyMember(${member.id})" class="text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Gestión de Mascotas -->
        <div class="bg-white rounded-xl shadow p-4 mb-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg"><i class="fa-solid fa-dog"></i> Mascotas</h3>
                <button onclick="openPetModal()" class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">
                    <i class="fa-solid fa-plus"></i> Nueva
                </button>
            </div>
            <div class="desktop-grid-x gap-3">
                ${pets.length > 0 ? pets.map(pet => `
                    <div class="border rounded-lg p-3 flex items-center justify-between bg-gray-50">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${pet.icon}</span>
                            <span class="font-medium text-sm">${pet.name}</span>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="editPet(${pet.id})" class="text-blue-500 hover:text-blue-700 p-1"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deletePet(${pet.id})" class="text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-500 text-sm col-span-full">No hay mascotas registradas</p>'}
            </div>
        </div>

        <!-- Gestión de Bolsos -->
        <div class="bg-white rounded-xl shadow p-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg"><i class="fa-solid fa-suitcase"></i> Bolsos y Contenedores</h3>
                <button onclick="openBagModal()" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                    <i class="fa-solid fa-plus"></i> Nuevo Bolso
                </button>
            </div>
            
            <div class="desktop-grid-x gap-4">
                ${bags.map(bag => {
                    const parentBag = bags.find(b => b.id === bag.parentId);
                    const locationText = parentBag 
                        ? `<span class="text-gray-600"><i class="fa-solid fa-level-up-alt rotate-90"></i> En: ${parentBag.name}</span>` 
                        : '<span class="text-green-600">Principal</span>';
                    
                    return `
                    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <img src="${bag.photo || 'bag-default.jpg'}" alt="${bag.name}" class="w-10 h-10 rounded-lg object-cover">
                                <div>
                                    <h4 class="font-bold text-gray-900">${bag.name}</h4>
                                    <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">${bag.type || 'bolso'}</span>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="editBag('${bag.id}')" class="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-full"><i class="fa-solid fa-pen"></i></button>
                                <button onclick="deleteBag('${bag.id}')" class="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-full"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                        
                        <div class="space-y-2 text-sm text-gray-600 mt-3">
                            <div class="flex justify-between border-b pb-1 border-gray-200">
                                <span>Asignado a:</span>
                                <span class="font-medium text-gray-900">${Array.isArray(bag.assignedTo) ? bag.assignedTo.join(', ') : (bag.assignedTo || '-')}</span>
                            </div>
                            <div class="flex justify-between items-center pt-1">
                                <span class="text-xs">Ubicación:</span>
                                <span class="text-xs font-medium">${locationText}</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// Helper para crear fila de item
function createItemRow(item, showBagInfo = false, bagData = null, editMode = false, bagId = null, removeMode = false) {
    const checkedClass = item.checked ? 'line-through text-gray-400' : 'text-gray-800';
    const bagBadge = (showBagInfo && bagData) ? `<span class="text-[10px] bg-blue-100 text-blue-800 px-1 rounded ml-2 inline-flex items-center gap-1"><img src="${bagData.photo || 'bag-default.jpg'}" class="w-3 h-3 rounded object-cover"> ${bagData.name}</span>` : '';
    const descriptionHTML = item.description ? `<div class="text-[11px] text-gray-400 mt-0.5">${item.description}</div>` : '';
    const isBeingEdited = editingItemId === item.id;
    const effectiveBagId = bagId || item.bag;
    const isLocked = lockedBags[effectiveBagId];
    
    // Verificar si este item fue recientemente asignado (para animación)
    const isHighlighted = newlyAssignedItems.includes(item.id);
    const highlightClass = isHighlighted ? 'newly-assigned-item' : '';
    
    if (removeMode) {
        const removeButton = item.checked ? '' : `
            <div class="flex-shrink-0 ml-3">
                <button onclick="event.stopPropagation(); removeItemFromBag(${item.id}, '${effectiveBagId}')" 
                    class="w-8 h-8 border-2 border-red-400 bg-red-50 rounded-full flex items-center justify-center hover:bg-red-500 hover:border-red-500 active:bg-red-600 transition-colors">
                    <i class="fa-solid fa-xmark text-red-500 text-sm hover:text-white"></i>
                </button>
            </div>`;
        
        return `
        <li class="flex items-center p-2 rounded transition-all" data-item-id="${item.id}">
            <div class="flex-1">
                <div class="${checkedClass} font-medium text-sm flex items-center flex-wrap">
                    ${item.name}
                    ${bagBadge}
                </div>
                ${descriptionHTML}
            </div>
            ${removeButton}
        </li>`;
    }
    
    if (isBeingEdited) {
        const catOptions = itemCategories.map(c => 
            `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
        ).join('');
        
        return `
        <li class="p-3 bg-blue-50 rounded-lg border-2 border-blue-300 mb-2" data-item-id="${item.id}">
            <div class="space-y-2">
                <div>
                    <label class="text-xs font-bold text-gray-600">Nombre</label>
                    <input type="text" id="edit-item-name" value="${item.name}" 
                        class="w-full border p-2 rounded text-sm mt-1" placeholder="Nombre del item">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600">Descripción</label>
                    <input type="text" id="edit-item-desc" value="${item.description || ''}" 
                        class="w-full border p-2 rounded text-sm mt-1" placeholder="Descripción opcional">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600">Categoría</label>
                    <select id="edit-item-category" class="w-full border p-2 rounded text-sm mt-1 bg-white">
                        ${catOptions}
                    </select>
                </div>
                <div class="flex gap-2 pt-2">
                    <button onclick="saveItemEdit(${item.id})" class="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm font-bold">
                        <i class="fa-solid fa-check mr-1"></i> Guardar
                    </button>
                    <button onclick="cancelItemEdit()" class="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm">
                        Cancelar
                    </button>
                </div>
            </div>
        </li>`;
    }
    
    if (editMode) {
        return `
        <li class="flex items-center p-2 rounded hover:bg-blue-50 cursor-pointer transition-all" data-item-id="${item.id}"
            onclick="startItemEdit(${item.id})">
            <div class="flex-shrink-0 mr-3">
                <div class="w-6 h-6 border-2 border-blue-400 bg-blue-50 rounded-full flex items-center justify-center">
                    <i class="fa-solid fa-pencil text-blue-500 text-xs"></i>
                </div>
            </div>
            <div class="flex-1">
                <div class="text-gray-800 font-medium text-sm flex items-center flex-wrap">
                    ${item.name}
                    ${bagBadge}
                </div>
                ${descriptionHTML}
            </div>
        </li>`;
    }
    
    if (isLocked) {
        return `
        <li class="flex items-center p-2 rounded bg-gray-50 opacity-70" data-item-id="${item.id}">
            <div class="flex-1">
                <div class="${checkedClass} font-medium text-sm flex items-center flex-wrap">
                    ${item.name}
                    ${bagBadge}
                </div>
                ${descriptionHTML}
            </div>
            <div class="flex-shrink-0 ml-3">
                <div class="w-6 h-6 border-2 rounded-full flex items-center justify-center ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}">
                    ${item.checked ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
                </div>
            </div>
        </li>`;
    }
    
    return `
    <li class="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer ${highlightClass}" data-item-id="${item.id}" onclick="toggleItem(${item.id}, '${effectiveBagId}')">
        <div class="flex-1">
            <div class="${checkedClass} font-medium text-sm flex items-center flex-wrap">
                ${item.name}
                ${bagBadge}
            </div>
            ${descriptionHTML}
            ${item.loc === 'Comprar' && !item.checked ? '<span class="text-[10px] text-red-500 font-bold">POR COMPRAR</span>' : ''}
        </div>
        <div class="flex-shrink-0 ml-3">
            <div class="w-6 h-6 border-2 rounded-full flex items-center justify-center ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}">
                ${item.checked ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
            </div>
        </div>
    </li>`;
}

// --- FUNCIONES DE INTERACCIÓN ---

function toggleTripFilter(tripId) {
    // Si el mismo viaje está activo, lo desactiva; si no, activa el nuevo
    tripFilterActive = tripFilterActive === tripId ? null : tripId;
    userDisabledFilter = tripFilterActive === null; // Marcar si se desactivó
    selectedItemsForTrip = []; // Limpiar selección al cambiar filtro
    render();
}

// Funciones para creación de nuevos items
function startCreateItem(ownerName) {
    creatingItemForOwner = ownerName;
    newItemText = '';
    newItemMatches = [];
    render();
    // Enfocar el input inmediatamente después de renderizar
    setTimeout(() => {
        const input = document.getElementById(`create-input-${ownerName}`);
        if (input) input.focus();
    }, 0);
}

function updateNewItemText(text) {
    newItemText = text;
    if (creatingItemForOwner) {
        const ownerItems = inventory.filter(item => {
            const ownerMember = familyMembers.find(m => m.id === item.owner);
            return ownerMember && ownerMember.name === creatingItemForOwner;
        });
        newItemMatches = ownerItems.filter(item => 
            item.name.toLowerCase().includes(text.toLowerCase())
        );
    }
    render();
    // Restaurar foco en el input después de renderizar
    if (creatingItemForOwner) {
        const input = document.getElementById(`create-input-${creatingItemForOwner}`);
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }
}

function createNewItem() {
    if (!creatingItemForOwner || !newItemText.trim()) return;
    
    const ownerMember = familyMembers.find(m => m.name === creatingItemForOwner);
    if (!ownerMember) return;
    
    // Generar nuevo ID (máximo + 1)
    const maxId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) : 0;
    const newId = maxId + 1;
    
    const newItem = {
        id: newId,
        name: newItemText.trim(),
        owner: ownerMember.id,
        loc: '',
        checked: false,
        icon: '',
        category: ''
    };
    
    // Agregar a inventory y newItems
    inventory.push(newItem);
    newItems.push(newItem);
    
    // Guardar en localStorage
    localStorage.setItem('newItems', JSON.stringify(newItems));
    
    // Resetear estado
    creatingItemForOwner = null;
    newItemText = '';
    newItemMatches = [];
    
    render();
}

function cancelCreateItem() {
    creatingItemForOwner = null;
    newItemText = '';
    newItemMatches = [];
    render();
}

function showBagSelector(itemId, familyName) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    let familyBags = bags.filter(b => {
        const assignees = Array.isArray(b.assignedTo) ? b.assignedTo : [b.assignedTo];
        return assignees.includes(familyName) || assignees.includes('Todos');
    });
    
    if (familyName === 'Casa') {
        familyBags = bags;
    }
    
    if (familyBags.length === 0) {
        alert('No hay bolsos disponibles para este familiar');
        return;
    }
    
    const bagButtons = familyBags.map(bag => 
        `<button onclick="assignItemToBag(${itemId}, '${bag.id}')"
            class="w-full py-3 px-4 bg-gray-100 hover:bg-blue-100 rounded-lg text-left flex items-center gap-3 transition-colors">
            <img src="${bag.photo || 'bag-default.jpg'}" alt="${bag.name}" class="w-10 h-10 rounded-lg object-cover">
            <span class="font-medium">${bag.name}</span>
        </button>`
    ).join('');    const modal = document.createElement('div');
    modal.id = 'bag-selector-modal';
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-end items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-t-2xl rounded-lg p-6 w-full w-11/12 max-w-sm max-h-[80vh] overflow-y-auto shadow-xl">
            <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hidden"></div>
            <h3 class="text-lg font-bold mb-2">Asignar a bolso</h3>
            <p class="text-sm text-gray-500 mb-4">¿En qué bolso quieres incluir "<strong>${item.name}</strong>"?</p>
            <div class="space-y-2">
                ${bagButtons}
            </div>
            <button onclick="closeBagSelector()" class="w-full mt-4 py-2 text-gray-500 hover:text-gray-700">
                Cancelar
            </button>
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) closeBagSelector();
    };
    document.body.appendChild(modal);
}

function closeBagSelector() {
    const modal = document.getElementById('bag-selector-modal');
    if (modal) modal.remove();
}

// Toggle item en la lista de pendientes (seleccionar/deseleccionar)
function togglePendingItem(itemId) {
    if (!assignModeActive) return;
    
    const index = pendingAssignItems.indexOf(itemId);
    if (index >= 0) {
        // Quitar de la selección
        pendingAssignItems.splice(index, 1);
    } else {
        // Agregar a la selección
        pendingAssignItems.push(itemId);
    }
    
    // Re-renderizar para actualizar vista
    render();
}

function toggleSelectedItem(itemId) {
    const index = selectedItemsForTrip.indexOf(itemId);
    if (index > -1) {
        selectedItemsForTrip.splice(index, 1);
    } else {
        selectedItemsForTrip.push(itemId);
    }
    render(); // Re-renderizar para actualizar la vista
}

// Confirmar y asignar todos los items pendientes
function confirmPendingItems() {
    if (!assignModeActive || !assignModeBagId || pendingAssignItems.length === 0) return;
    
    pendingAssignItems.forEach(itemId => {
        // Verificar si ya existe esta relación
        const existingRelation = itemsTrips.find(
            it => it.itemId === itemId && it.tripId === currentTripId
        );
        
        if (existingRelation) {
            // Actualizar bolso
            existingRelation.bagId = assignModeBagId;
        } else {
            // Crear nueva relación
            itemsTrips.push({
                itemId: itemId,
                tripId: currentTripId,
                bagId: assignModeBagId,
                checked: false
            });
        }
        
        // Agregar a la lista para destacar
        newlyAssignedItems.push(itemId);
    });
    
    // Guardar items para destacar después de navegar
    sessionStorage.setItem('highlightItems', JSON.stringify(newlyAssignedItems));
    
    // Navegar de vuelta a bolsos
    window.location.href = `index.html?viaje=${currentTripId}`;
}

// Función antigua (mantener por compatibilidad)
function assignItemToBagFromList(itemId) {
    togglePendingItem(itemId);
}

// Abrir modal para crear un nuevo item con owner pre-asignado
function openCreateItemForOwner(ownerId, familyName) {
    // Guardar el contexto actual para cuando se cree el item
    sessionStorage.setItem('createItemOwner', JSON.stringify({
        ownerId: ownerId,
        familyName: familyName,
        bagId: assignModeBagId,
        tripId: currentTripId,
        returnUrl: window.location.href
    }));
    
    // Si no estamos realmente en items.html O no existe el modal en este DOM, redirigir a `items.html`.
    // Esto evita que pages móviles que por caching contendrían el modal lo muestren accidentalmente.
    const modalEl = document.getElementById('modal-add');
    if (!window.location.href.includes('items.html') || !modalEl) {
        // La información del owner ya está en sessionStorage; items.html leerá esto y abrirá el modal
        window.location.href = `items.html`;
        return;
    }

    // Abrir modal de creación (solo en items.html y si el modal está presente)
    modalEl.classList.remove('hidden'); 
    
    const itemsList = document.getElementById('newItemsList');
    itemsList.innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    
    // Pre-seleccionar el familiar
    const familySelect = document.getElementById('newItemFamily');
    if (familySelect) {
        // Buscar y seleccionar el familiar correcto
        const options = Array.from(familySelect.options);
        const matchOption = options.find(opt => opt.value === familyName);
        if (matchOption) {
            familySelect.value = familyName;
        }
        onFamilyChange();
        
        // Pre-seleccionar el bolso actual si existe
        if (assignModeBagId) {
            const bagSelect = document.getElementById('newItemBag');
            if (bagSelect) {
                bagSelect.value = assignModeBagId;
            }
        }
    }
    
    // Enfocar el input
    setTimeout(() => {
        const input = itemsList.querySelector('input');
        if (input) input.focus();
    }, 100);
}





// Contar cambios locales almacenados
function countLocalChanges() {
    return 0; // Sin localStorage, siempre 0
}

// Actualizar el contador de cambios locales en el menú
function updateLocalChangesCounter() {
    const count = countLocalChanges();
    const counterEl = document.getElementById('local-changes-count');
    if (counterEl) {
        if (count > 0) {
            counterEl.textContent = count;
            counterEl.classList.remove('hidden');
        } else {
            counterEl.classList.add('hidden');
        }
    }
}

// Borrar todos los datos locales
function clearLocalData() {
    alert('No se usa localStorage. Los datos se cargan desde los archivos JSON.');
}

function assignItemToBag(itemId, bagId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    item.bag = bagId;
    // Actualizar bagId en itemsTrips
    const tripItem = itemsTrips.find(it => it.itemId === itemId && it.tripId === currentTripId);
    if (tripItem) {
        tripItem.bagId = bagId;
    }
    closeBagSelector();
    render();
}

function toggleBagEditMode(bagId) {
    if (editingItemId) {
        editingItemId = null;
    }
    editingBags[bagId] = !editingBags[bagId];
    if (!editingBags[bagId]) {
        delete editingBags[bagId];
    }
    render();
}

function startItemEdit(itemId) {
    editingItemId = itemId;
    render();
    setTimeout(() => {
        const nameInput = document.getElementById('edit-item-name');
        if (nameInput) nameInput.focus();
    }, 100);
}

function cancelItemEdit() {
    editingItemId = null;
    render();
}

function saveItemEdit(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const newName = document.getElementById('edit-item-name').value.trim();
    const newDesc = document.getElementById('edit-item-desc').value.trim();
    const newCategory = document.getElementById('edit-item-category').value;
    
    if (!newName) {
        alert('El nombre es obligatorio');
        return;
    }
    
    item.name = newName;
    item.description = newDesc;
    item.category = newCategory;
    
    editingItemId = null;
    render();
}

function toggleBagExpand(bagId) {
    if (window.innerWidth >= 768) return;
    const currentState = expandedBags[bagId] !== false;
    expandedBags[bagId] = !currentState;
    render();
}

// Variable para el menú de edición del bolso
let openBagEditMenu = null;

function toggleBagEditMenu(bagId) {
    if (openBagEditMenu === bagId) {
        openBagEditMenu = null;
    } else {
        openBagEditMenu = bagId;
    }
    // Mostrar/ocultar el menú
    document.querySelectorAll('[id^="bag-edit-menu-"]').forEach(menu => {
        menu.classList.add('hidden');
    });
    if (openBagEditMenu) {
        const menu = document.getElementById('bag-edit-menu-' + bagId);
        if (menu) menu.classList.remove('hidden');
    }
}

function startRemovingItems(bagId) {
    openBagEditMenu = null;
    removingFromBag[bagId] = true;
    render();
}

function cancelRemovingItems(bagId) {
    removingFromBag[bagId] = false;
    render();
}

function toggleBagLock(bagId) {
    openBagEditMenu = null;
    lockedBags[bagId] = !lockedBags[bagId];
    render();
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(e) {
    if (openBagEditMenu && !e.target.closest('[id^="bag-edit-menu-"]') && !e.target.closest('button')) {
        openBagEditMenu = null;
        document.querySelectorAll('[id^="bag-edit-menu-"]').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

function toggleBagMenu(bagId, event) {
    event.stopPropagation();
    if (openBagMenu === bagId) {
        openBagMenu = null;
    } else {
        openBagMenu = bagId;
    }
    render();
}

function closeBagMenu() {
    if (openBagMenu) {
        openBagMenu = null;
        render();
    }
}

document.addEventListener('click', function(e) {
    if (openBagMenu && !e.target.closest('.bag-menu-container')) {
        closeBagMenu();
    }
});

function startEditBagName(bagId, event) {
    event.stopPropagation();
    openBagMenu = null;
    editingBagName = bagId;
    render();
    setTimeout(() => {
        const input = document.getElementById('edit-bag-name-input');
        if (input) {
            input.focus();
            input.select();
        }
    }, 50);
}

function saveBagName(bagId, event) {
    event.stopPropagation();
    const input = document.getElementById('edit-bag-name-input');
    const newName = input.value.trim();
    if (!newName) {
        alert('El nombre no puede estar vacío');
        return;
    }
    const bag = bags.find(b => b.id === bagId);
    if (bag) {
        bag.name = newName;
    }
    editingBagName = null;
    render();
}

function cancelEditBagName(event) {
    event.stopPropagation();
    editingBagName = null;
    render();
}

function lockBag(bagId, event) {
    event.stopPropagation();
    openBagMenu = null;
    lockedBags[bagId] = true;
    render();
}

function unlockBag(bagId, event) {
    event.stopPropagation();
    if (confirm('¿Quieres abrir el bolso?')) {
        lockedBags[bagId] = false;
        render();
    }
}

function toggleRemoveMode(bagId) {
    removingFromBag[bagId] = !removingFromBag[bagId];
    if (!removingFromBag[bagId]) {
        editingBags[bagId] = false;
    }
    openBagMenu = null;
    render();
}

function removeItemFromBag(itemId, bagId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    if (!item.owner && item.bag) {
        const bag = bags.find(b => b.id === item.bag);
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
    const tripItem = itemsTrips.find(it => it.itemId === itemId && it.tripId === currentTripId);
    if (tripItem) {
        tripItem.bagId = null;
        tripItem.checked = false;
    }
    
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

function openModalForBagLocked(bagId, event) {
    event.stopPropagation();
    openBagMenu = null;
    const bag = bags.find(b => b.id === bagId);
    if (!bag) return;
    
    // Si no estamos en la página de Items, redirigir a `items.html` para realizar la creación allí
    const modalEl2 = document.getElementById('modal-add');
    if (!window.location.href.includes('items.html') || !modalEl2) {
        sessionStorage.setItem('createFromBagLocked', JSON.stringify({ bagId }));
        window.location.href = `items.html`;
        return;
    }

    modalEl2.classList.remove('hidden');
    
    const itemsList = document.getElementById('newItemsList');
    itemsList.innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    
    const familySelect = document.getElementById('newItemFamily');
    const familiesWithBags = familyMembers.filter(m => 
        bags.some(b => b.assignedTo === m.name || (Array.isArray(b.assignedTo) && b.assignedTo.includes(m.name)))
    );
    const allAssignees = bags.map(b => Array.isArray(b.assignedTo) ? b.assignedTo : [b.assignedTo]).flat();
    const specialAssignees = [...new Set(allAssignees)]
        .filter(a => a && !familyMembers.some(m => m.name === a));
    
    familySelect.innerHTML = familiesWithBags.map(m => 
        `<option value="${m.name}">${m.icon} ${m.name}</option>`
    ).join('') + specialAssignees.map(s => 
        `<option value="${s}">${s === 'Todos' ? '👨‍👩‍👧‍👦' : '📦'} ${s}</option>`
    ).join('');
    
    const locSelect = document.getElementById('newItemLocation');
    locSelect.innerHTML = availableLocations.map(l => `<option value="${l}">${l}</option>`).join('') + 
        '<option value="__nueva_zona__">➕ Nueva zona...</option>';
    locSelect.addEventListener('change', handleLocationChange);
    
    const assignee = Array.isArray(bag.assignedTo) ? bag.assignedTo[0] : bag.assignedTo;
    familySelect.value = assignee;
    familySelect.disabled = true;
    onFamilyChange();
    
    const bagSelect = document.getElementById('newItemBag');
    bagSelect.value = bagId;
    bagSelect.disabled = true;
    
    document.getElementById('bagSelectSection').classList.add('hidden');
    const bagAutoSection = document.getElementById('bagAutoSection');
    bagAutoSection.classList.remove('hidden');
    document.getElementById('bagAutoName').innerHTML = `<span class="inline-flex items-center gap-2">🔒 <img src="${bag.photo || 'bag-default.jpg'}" class="w-6 h-6 rounded object-cover inline"> ${bag.name}</span>`;
    
    checkBagType();
}

function startCreatingBag(memberName) {
    creatingBagForMember = memberName;
    newBagName = '';
    render();
    setTimeout(() => {
        const input = document.getElementById('new-bag-name-input');
        if (input) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                input.focus();
                input.click();
            }, 100);
        }
    }, 100);
}

function saveNewBag(memberName) {
    const input = document.getElementById('new-bag-name-input');
    const name = input.value.trim();
    
    if (!name) {
        alert('El nombre del bolso no puede estar vacío');
        return;
    }
    
    const maxId = Math.max(0, ...bags.map(b => typeof b.id === 'number' ? b.id : 0));
    const newId = maxId + 1;
    
    const newBag = {
        id: newId,
        name: name,
        icon: '🎒',
        assignedTo: memberName
    };
    
    bags.unshift(newBag);
    creatingBagForMember = null;
    newBagName = '';
    render();
    
    setTimeout(() => {
        const bagCard = document.getElementById(`bag-card-${newId}`);
        if (bagCard) {
            bagCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            bagCard.classList.add('ring-2', 'ring-blue-400');
            setTimeout(() => {
                bagCard.classList.remove('ring-2', 'ring-blue-400');
            }, 2000);
        }
    }, 100);
}

function cancelNewBag() {
    creatingBagForMember = null;
    newBagName = '';
    render();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function toggleHeaderSearch() {
    headerSearchOpen = !headerSearchOpen;
    const searchBar = document.getElementById('headerSearch');
    const mainBar = document.getElementById('headerMain');
    const searchInput = document.getElementById('headerSearchInput');
    
    if (headerSearchOpen) {
        searchBar.classList.add('open');
        mainBar.style.visibility = 'hidden';
        searchInput.focus();
    } else {
        searchBar.classList.remove('open');
        mainBar.style.visibility = 'visible';
        const dropdown = document.getElementById('searchDropdown');
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        if (searchTerm) {
            searchTerm = '';
            searchInput.value = '';
            document.getElementById('headerClearBtn').classList.add('hidden');
        }
    }
}

function clearHeaderSearch() {
    const input = document.getElementById('headerSearchInput');
    const dropdown = document.getElementById('searchDropdown');
    input.value = '';
    searchTerm = '';
    document.getElementById('headerClearBtn').classList.add('hidden');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.focus();
}

function updateHeaderStats() {
    // Contar solo items del viaje actual
    const tripItems = itemsTrips.filter(it => it.tripId === currentTripId);
    const totalItems = tripItems.length;
    const totalChecked = tripItems.filter(it => it.checked).length;
    const countEl = document.getElementById('headerItemCount');
    if (countEl) countEl.textContent = `${totalChecked}/${totalItems}`;
}

function toggleItem(id, bagId) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    const effectiveBagId = bagId !== undefined ? bagId : null;
    
    if (effectiveBagId && lockedBags[effectiveBagId]) {
        return;
    }
    
    // Actualizar el estado en itemsTrips
    const tripItem = itemsTrips.find(it => it.itemId === id && it.tripId === currentTripId);
    if (tripItem) {
        tripItem.checked = !tripItem.checked;
    }
    
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
    
    if (searchTerm && currentTab === 'bolsos') {
        setTimeout(() => {
            const input = document.getElementById('searchInput');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 0);
    }
}

function updateHeaderCounter() {
    const tripItems = itemsTrips.filter(it => it.tripId === currentTripId);
    const totalItems = tripItems.length;
    const checkedItems = tripItems.filter(it => it.checked).length;
    const counterEl = document.getElementById('headerItemCount');
    if (counterEl) {
        counterEl.textContent = `${checkedItems}/${totalItems}`;
    }
}

function updateBagProgress(bagId) {
    const bagItems = itemsTrips.filter(it => it.tripId === currentTripId && it.bagId == bagId);
    const totalCount = bagItems.length;
    const checkedCount = bagItems.filter(it => it.checked).length;
    const bagProgress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
    
    const ratioEl = document.getElementById(`bag-ratio-${bagId}`);
    if (ratioEl) {
        ratioEl.textContent = `${checkedCount}/${totalCount}`;
    }
    
    const progressEl = document.getElementById(`bag-progress-${bagId}`);
    if (progressEl) {
        progressEl.style.width = `${bagProgress}%`;
    }
    
    // Actualizar borde si está completo
    const bagCard = document.getElementById(`bag-card-${bagId}`);
    if (bagCard) {
        const completeBorder = checkedCount === totalCount && totalCount > 0 ? 'ring-2 ring-green-400' : '';
        const isLocked = lockedBags[bagId] || false;
        bagCard.className = `bg-white rounded-xl shadow bag-card ${completeBorder} relative ${isLocked ? 'bag-locked-border' : ''} mt-0.5`;
    }
}

function updateSearchResults(value) {
    searchTerm = value;
    const clearBtn = document.getElementById('headerClearBtn');
    const dropdown = document.getElementById('searchDropdown');
    
    if (clearBtn) {
        if (value) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
    
    if (value.length > 0) {
        const searchResults = inventory.filter(item => 
            item.name.toLowerCase().includes(value.toLowerCase())
        );
        
        const noResultsHTML = `
            <div class="p-6 text-center">
                <i class="fa-solid fa-search mb-2 text-2xl text-gray-300"></i>
                <p class="text-gray-400 mb-4">No se encontró "${value}"</p>
                <button onclick="openModalWithName('${value.replace(/'/g, "\\'")}'); toggleHeaderSearch();" 
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition inline-flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> Agregar "${value}"
                </button>
            </div>`;
        
        const resultsHTML = searchResults.length > 0 ? searchResults.map(item => {
            const itemBag = bags.find(b => b.id === item.bag);
            const bagName = itemBag ? itemBag.name : 'Sin asignar';
            const bagPhoto = itemBag ? itemBag.photo : null;
            const checkedClass = item.checked ? 'bg-green-50' : '';
            const textClass = item.checked ? 'line-through text-gray-400' : 'text-gray-800';
            
            let familyIcons = '';
            if (itemBag && itemBag.assignedTo) {
                const assignees = Array.isArray(itemBag.assignedTo) ? itemBag.assignedTo : [itemBag.assignedTo];
                familyIcons = assignees.map(name => {
                    const member = familyMembers.find(m => m.name === name);
                    return member ? member.icon : '';
                }).join('');
            }
            
            const itemIcon = `<span class="inline-block w-5 text-center">${item.icon || ''}</span>`;
            const bagImgHTML = bagPhoto ? `<img src="${bagPhoto}" class="w-4 h-4 rounded object-cover inline-block mr-1">` : '📦';
            
            return `
            <div class="p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 ${checkedClass}" onclick="toggleSearchItem(${item.id})">
                <span class="text-2xl">${familyIcons || '📦'}</span>
                <div class="flex-1">
                    <span class="font-medium ${textClass}">${itemIcon}<span class="ml-1">${item.name}</span></span>
                    <div class="text-xs text-gray-500 flex items-center">
                        ${bagImgHTML} ${bagName}
                    </div>
                </div>
                <div class="w-6 h-6 border-2 rounded-full flex items-center justify-center ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}">
                    ${item.checked ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
                </div>
            </div>`;
        }).join('') : noResultsHTML;
        
        dropdown.innerHTML = `
            ${resultsHTML}
            ${searchResults.length > 0 ? `<div class="text-xs text-gray-500 text-center py-2 bg-gray-50">${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}</div>` : ''}
        `;
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }
}

function toggleSearchItem(id) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        updateHeaderStats();
        updateSearchResults(searchTerm);
    }
}

function deleteItem(id) {
    if(confirm('¿Borrar este ítem?')) {
        inventory = inventory.filter(i => i.id !== id);
        render();
    }
}

function openModal() { 
    openModalWithName('');
}

function openModalWithName(name) {
    openModalForBag(null, name);
}

function openModalForBag(bagId, name = '') {
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
        searchTerm = '';
    } else {
        itemsList.innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    }
    
    const familySelect = document.getElementById('newItemFamily');
    const familiesWithBags = familyMembers.filter(m => 
        bags.some(b => b.assignedTo === m.name || (Array.isArray(b.assignedTo) && b.assignedTo.includes(m.name)))
    );
    const allAssignees = bags.map(b => Array.isArray(b.assignedTo) ? b.assignedTo : [b.assignedTo]).flat();
    const specialAssignees = [...new Set(allAssignees)]
        .filter(a => a && !familyMembers.some(m => m.name === a));
    
    familySelect.innerHTML = familiesWithBags.map(m => 
        `<option value="${m.name}">${m.icon} ${m.name}</option>`
    ).join('') + specialAssignees.map(s => 
        `<option value="${s}">${s === 'Todos' ? '👨‍👩‍👧‍👦' : '📦'} ${s}</option>`
    ).join('');
    
    const locSelect = document.getElementById('newItemLocation');
    locSelect.innerHTML = availableLocations.map(l => `<option value="${l}">${l}</option>`).join('') + 
        '<option value="__nueva_zona__">➕ Nueva zona...</option>';
    locSelect.addEventListener('change', handleLocationChange);

    if (bagId) {
        const bag = bags.find(b => b.id === bagId);
        if (bag) {
            const assignee = Array.isArray(bag.assignedTo) ? bag.assignedTo[0] : bag.assignedTo;
            familySelect.value = assignee;
            onFamilyChange();
            document.getElementById('newItemBag').value = bagId;
            bagSelect.disabled = true;
            checkBagType();
            return;
        }
    }

    onFamilyChange();
}

function onFamilyChange() {
    const familyName = document.getElementById('newItemFamily').value;
    const familyBags = bags.filter(b => 
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
    const bag = bags.find(b => b.id === bagId);
    const tempSection = document.getElementById('tempSection');
    
    if (bag && bag.type === 'cooler') {
        tempSection.classList.remove('hidden');
    } else {
        tempSection.classList.add('hidden');
        document.getElementById('newItemTemp').value = 'ambient';
    }
}

function closeModal() { 
    document.getElementById('modal-add').classList.add('hidden');
    document.getElementById('newItemsList').innerHTML = '<input type="text" class="new-item-input w-full border p-3 rounded-lg text-base" placeholder="Ej. Pañales" enterkeyhint="next">';
    const bagSelect = document.getElementById('newItemBag');
    const familySelect = document.getElementById('newItemFamily');
    if (bagSelect) bagSelect.disabled = false;
    if (familySelect) familySelect.disabled = false;
    openBagMenu = null;
}

function addNewItemInput() {
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

function saveNewItems() {
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
    
    const bag = bags.find(b => b.id === bagId);

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
        inventory.push(newItem);
    });
    
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

function inviteUser() {
    const email = prompt("Ingresa el correo del familiar a invitar:");
    if (email) {
        alert(`Invitación enviada a ${email} (Simulado)`);
    }
}

function toggleGroupByCategory() {
    groupByCategory = !groupByCategory;
    render();
}

function openBagModal(bagId = null) {
    document.getElementById('modal-bag').classList.remove('hidden');
    
    const parentSelect = document.getElementById('bagParent');
    parentSelect.innerHTML = '<option value="">-- Ninguno (Bolso Principal) --</option>' + 
        bags.filter(b => b.id !== bagId).map(b => `<option value="${b.id}">${b.icon} ${b.name}</option>`).join('');

    let currentAssigned = [];
    if (bagId) {
        const bag = bags.find(b => b.id === bagId);
        if (Array.isArray(bag.assignedTo)) {
            currentAssigned = bag.assignedTo;
        } else if (bag.assignedTo) {
            currentAssigned = [bag.assignedTo];
        }
    } else {
        currentAssigned = []; 
    }

    const assignedContainer = document.getElementById('bagAssignedToContainer');
    assignedContainer.innerHTML = familyMembers.map(m => {
        const isChecked = currentAssigned.includes(m.name) ? 'checked' : '';
        return `
        <label class="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
            <input type="checkbox" name="bagAssignedTo" value="${m.name}" class="form-checkbox h-4 w-4 text-blue-600 rounded" ${isChecked}>
            <span class="text-lg">${m.icon}</span>
            <span class="text-sm text-gray-700">${m.name}</span>
        </label>`;
    }).join('');

    if (bagId) {
        const bag = bags.find(b => b.id === bagId);
        document.getElementById('bagModalTitle').innerText = 'Editar Bolso';
        document.getElementById('bagId').value = bag.id;
        document.getElementById('bagName').value = bag.name;
        document.getElementById('bagPhoto').value = bag.photo || '';
        document.getElementById('bagPhotoPreview').src = bag.photo || 'bag-default.jpg';
        document.getElementById('bagType').value = bag.type || 'bolso';
        document.getElementById('bagParent').value = bag.parentId || '';
    } else {
        document.getElementById('bagModalTitle').innerText = 'Nuevo Bolso';
        document.getElementById('bagId').value = '';
        document.getElementById('bagName').value = '';
        document.getElementById('bagPhoto').value = '';
        document.getElementById('bagPhotoPreview').src = 'bag-default.jpg';
        document.getElementById('bagType').value = 'bolso';
        document.getElementById('bagParent').value = '';
    }
}

function closeBagModal() {
    document.getElementById('modal-bag').classList.add('hidden');
}

function updateBagPhotoPreview() {
    const photo = document.getElementById('bagPhoto').value;
    document.getElementById('bagPhotoPreview').src = normalizePhotoPath(photo) || 'bag-default.jpg';
}

function saveBag() {
    const id = document.getElementById('bagId').value;
    const name = document.getElementById('bagName').value;
    const photo = document.getElementById('bagPhoto').value;

    const type = document.getElementById('bagType').value;
    const parentId = document.getElementById('bagParent').value || null;

    if (!name) return alert("El nombre es obligatorio");

    if (id) {
        const bag = bags.find(b => b.id == id); // Loose equality for string/number id
        if (bag) {
            bag.name = name;
            bag.photo = normalizePhotoPath(photo);
            bag.type = type;
            bag.parentId = parentId;
        }
    } else {
        const maxId = bags.length > 0 ? Math.max(...bags.map(b => b.id)) : 0;
        const newBag = {
            id: maxId + 1,
            name: name,
            photo: normalizePhotoPath(photo)
        };
        bags.push(newBag);
    }

    closeBagModal();
    render();
}

function editBag(id) {
    openBagModal(id);
}

function deleteBag(id) {
    if (confirm('¿Estás seguro de borrar este bolso? Se borrarán también sus items asignados.')) {
        bags = bags.filter(b => b.id != id);
        inventory = inventory.filter(i => i.bag != id);
        render();
    }
}

function openFamilyModal(id = null) {
    document.getElementById('modal-family').classList.remove('hidden');
    // Reset icon selection
    document.querySelectorAll('.family-icon-btn').forEach(btn => {
        btn.classList.remove('border-purple-600', 'bg-purple-100');
        btn.classList.add('border-gray-200');
    });
    
    if (id) {
        const member = familyMembers.find(m => m.id === id);
        document.getElementById('familyModalTitle').innerText = 'Editar Familiar';
        document.getElementById('familyId').value = member.id;
        document.getElementById('familyName').value = member.name;
        document.getElementById('familyIcon').value = member.icon || '👤';
        selectFamilyIcon(member.icon || '👤');
    } else {
        document.getElementById('familyModalTitle').innerText = 'Nuevo Familiar';
        document.getElementById('familyId').value = '';
        document.getElementById('familyName').value = '';
        document.getElementById('familyIcon').value = '👤';
    }
}

function selectFamilyIcon(icon) {
    document.getElementById('familyIcon').value = icon;
    document.querySelectorAll('.family-icon-btn').forEach(btn => {
        if (btn.dataset.icon === icon) {
            btn.classList.remove('border-gray-200');
            btn.classList.add('border-purple-600', 'bg-purple-100');
        } else {
            btn.classList.remove('border-purple-600', 'bg-purple-100');
            btn.classList.add('border-gray-200');
        }
    });
}

function closeFamilyModal() {
    document.getElementById('modal-family').classList.add('hidden');
}

let previousLocationValue = '';

function handleLocationChange(e) {
    if (e.target.value === '__nueva_zona__') {
        previousLocationValue = availableLocations[0] || '';
        openZonaModal();
    }
}

function openZonaModal() {
    document.getElementById('newZonaName').value = '';
    document.getElementById('modal-zona').classList.remove('hidden');
    setTimeout(() => document.getElementById('newZonaName').focus(), 100);
}

function closeZonaModal() {
    document.getElementById('modal-zona').classList.add('hidden');
    const locSelect = document.getElementById('newItemLocation');
    if (locSelect.value === '__nueva_zona__') {
        locSelect.value = previousLocationValue;
    }
}

function createNewZona() {
    const zonaName = document.getElementById('newZonaName').value.trim();
    if (!zonaName) return alert("Escribe un nombre para la zona");
    
    if (availableLocations.includes(zonaName)) {
        alert("Esta zona ya existe");
        return;
    }
    
    availableLocations.push(zonaName);
    availableLocations.sort((a, b) => {
        if (a === 'Comprar') return 1;
        if (b === 'Comprar') return -1;
        return a.localeCompare(b, 'es');
    });
    
    const locSelect = document.getElementById('newItemLocation');
    locSelect.innerHTML = availableLocations.map(l => `<option value="${l}">${l}</option>`).join('') + 
        '<option value="__nueva_zona__">➕ Nueva zona...</option>';
    
    locSelect.value = zonaName;
    
    document.getElementById('modal-zona').classList.add('hidden');
}

function saveFamilyMember() {
    const id = document.getElementById('familyId').value;
    const name = document.getElementById('familyName').value;
    const icon = document.getElementById('familyIcon').value || '👤';

    if (!name) return alert("El nombre es obligatorio");

    if (id) {
        const member = familyMembers.find(m => m.id === parseInt(id));
        if (member) {
            member.name = name;
            member.icon = icon;
        }
    } else {
        const maxId = familyMembers.length > 0 ? Math.max(...familyMembers.map(m => m.id)) : 0;
        familyMembers.push({ id: maxId + 1, name, icon, type: 'persona' });
    }
    closeFamilyModal();
    render();
}

function editFamilyMember(id) {
    openFamilyModal(id);
}

function deleteFamilyMember(id) {
    if (confirm('¿Borrar este familiar?')) {
        familyMembers = familyMembers.filter(m => m.id !== id);
        render();
    }
}

// --- FUNCIONES DE MASCOTAS ---

function openPetModal(id = null) {
    document.getElementById('modal-pet').classList.remove('hidden');
    if (id) {
        const pet = pets.find(p => p.id === id);
        document.getElementById('petModalTitle').innerText = 'Editar Mascota';
        document.getElementById('petId').value = pet.id;
        document.getElementById('petName').value = pet.name;
    } else {
        document.getElementById('petModalTitle').innerText = 'Nueva Mascota';
        document.getElementById('petId').value = '';
        document.getElementById('petName').value = '';
    }
}

function closePetModal() {
    document.getElementById('modal-pet').classList.add('hidden');
}

function savePet() {
    const id = document.getElementById('petId').value;
    const name = document.getElementById('petName').value;

    if (!name) return alert("El nombre es obligatorio");

    if (id) {
        const pet = pets.find(p => p.id === parseInt(id));
        if (pet) pet.name = name;
    } else {
        const maxId = pets.length > 0 ? Math.max(...pets.map(p => p.id)) : 0;
        pets.push({ id: maxId + 1, name, icon: '🐕', type: 'mascota' });
        // También agregar a familyMembers para que aparezca en items
        const familyMaxId = Math.max(...familyMembers.map(m => m.id));
        familyMembers.push({ id: familyMaxId + 1, name, icon: '🐕', type: 'mascota' });
    }
    closePetModal();
    render();
}

function editPet(id) {
    openPetModal(id);
}

function deletePet(id) {
    if (confirm('¿Borrar esta mascota?')) {
        const pet = pets.find(p => p.id === id);
        if (pet) {
            // Remover de pets
            pets = pets.filter(p => p.id !== id);
            // Remover de familyMembers si existe
            familyMembers = familyMembers.filter(m => !(m.name === pet.name && m.type === 'mascota'));
        }
        render();
    }
}

async function loadInventory() {
    try {
        const response = await fetch('JSON/inventario.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        inventory = await response.json();
        
        // Cargar nuevos items desde localStorage y fusionarlos
        newItems = JSON.parse(localStorage.getItem('newItems') || '[]');
        inventory = [...inventory, ...newItems];
        
        render();
        // Después de renderizar, procesar posibles solicitudes de creación que vinieron por redirect desde otras páginas
        processPendingCreateSession();
    } catch (e) {
        console.error("No se pudo cargar el inventario:", e);
        render();
        processPendingCreateSession();
    }
}

// Procesa claves temporales en sessionStorage usadas para redirigir a items.html y abrir el modal
function processPendingCreateSession() {
    try {
        // Only process pending create requests when we're on the Items page.
        // This prevents accidental redirects when visiting other tabs (e.g., Bolsos).
        if (!window.location.href.includes('items.html') && currentTab !== 'inventario') {
            return;
        }
        const createOwnerRaw = sessionStorage.getItem('createItemOwner');
        if (createOwnerRaw) {
            const ctx = JSON.parse(createOwnerRaw);
            // Limpiar para evitar loops
            sessionStorage.removeItem('createItemOwner');
            // Suprimir los enlaces de creación por familia y marcar familia objetivo
            suppressFamilyCreateLinks = true;
            pendingCreateTargetFamily = ctx.familyName;
            render();
            // Scroll y foco al final de la sección donde está el botón Crear
            setTimeout(() => scrollToFamilyCreate(pendingCreateTargetFamily), 150);
            return;
        }

        const createBagRaw = sessionStorage.getItem('createFromBag');
        if (createBagRaw) {
            const ctx = JSON.parse(createBagRaw);
            sessionStorage.removeItem('createFromBag');
            // Suprimir enlaces de creación por familia y marcar familia objetivo basada en el bolso
            suppressFamilyCreateLinks = true;
            // Determinar familiar asignado al bolso (si existe)
            try {
                const bag = bags.find(b => String(b.id) === String(ctx.bagId));
                let assignee = null;
                if (bag) {
                    if (Array.isArray(bag.assignedTo)) assignee = bag.assignedTo[0];
                    else assignee = bag.assignedTo || null;
                }
                // Fallback: si no hay assignee, usar 'Casa'
                pendingCreateTargetFamily = assignee || 'Casa';
            } catch (e) {
                pendingCreateTargetFamily = 'Casa';
            }
            render();
            setTimeout(() => scrollToFamilyCreate(pendingCreateTargetFamily), 150);
            return;
        }

        const createBagLockedRaw = sessionStorage.getItem('createFromBagLocked');
        if (createBagLockedRaw) {
            const ctx = JSON.parse(createBagLockedRaw);
            sessionStorage.removeItem('createFromBagLocked');
            suppressFamilyCreateLinks = true;
            try {
                const bag = bags.find(b => String(b.id) === String(ctx.bagId));
                let assignee = null;
                if (bag) {
                    if (Array.isArray(bag.assignedTo)) assignee = bag.assignedTo[0];
                    else assignee = bag.assignedTo || null;
                }
                pendingCreateTargetFamily = assignee || 'Casa';
            } catch (e) {
                pendingCreateTargetFamily = 'Casa';
            }
            render();
            setTimeout(() => scrollToFamilyCreate(pendingCreateTargetFamily), 150);
            return;
        }
        // If user arrived via URL params with bolso=...&modo=asignar, target that bag's owner
        if (pendingCreateBagIdFromUrl) {
            try {
                const bag = bags.find(b => String(b.id) === String(pendingCreateBagIdFromUrl));
                let assignee = null;
                if (bag) {
                    if (Array.isArray(bag.assignedTo)) assignee = bag.assignedTo[0];
                    else assignee = bag.assignedTo || null;
                }
                pendingCreateTargetFamily = assignee || 'Casa';
                // already set suppressFamilyCreateLinks in initCurrentTripId
                render();
                setTimeout(() => scrollToFamilyCreate(pendingCreateTargetFamily), 150);
            } catch (e) {
                console.warn('Error processing pendingCreateBagIdFromUrl', e);
            } finally {
                pendingCreateBagIdFromUrl = null;
            }
            return;
        }
    } catch (e) {
        console.error('Error procesando creación pendiente:', e);
    }
}

// Scroll to the target family's create card and apply a brief highlight
function scrollToFamilyCreate(familyName) {
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
            // Scroll into view
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Brief highlight
            const original = target.style.boxShadow;
            target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            setTimeout(() => { target.style.boxShadow = original || ''; }, 1800);
        }
    } catch (e) {
        console.warn('scrollToFamilyCreate error', e);
    } finally {
        pendingCreateTargetFamily = null;
    }
}

// Cargar familiares desde family.json
async function loadFamily() {
    try {
        const response = await fetch('JSON/family.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        familyMembers = await response.json();
    } catch (e) {
        console.error("No se pudo cargar la familia:", e);
    }
}

// Cargar mascotas desde pets.json
async function loadPets() {
    try {
        const response = await fetch('JSON/pets.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        pets = await response.json();
    } catch (e) {
        console.error("No se pudo cargar las mascotas:", e);
    }
}

// Cargar bolsos desde bags.json
async function loadBags() {
    try {
        const response = await fetch('JSON/bags.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        bags = await response.json();
        // Normalize photo paths so files like `b1.jpeg` resolve to `images/bags/b1.jpeg`
        bags = bags.map(b => ({ ...b, photo: normalizePhotoPath(b.photo) }));
    } catch (e) {
        console.error("No se pudo cargar los bolsos:", e);
    }
}

// Cargar relaciones items-viajes desde items_trips.json
async function loadItemsTrips() {
    try {
        const response = await fetch('JSON/items_trips.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        itemsTrips = await response.json();
    } catch (e) {
        console.error("No se pudo cargar items_trips:", e);
        itemsTrips = [];
    }
}

// Variable global para el nombre del viaje
let currentTripName = '';

// Cargar nombre del viaje activo desde viajes.json
async function loadTripName() {
    try {
        const response = await fetch('JSON/viajes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const viajes = await response.json();
        // Guardar todos los viajes
        allTrips = viajes;
        
        // Buscar el viaje según currentTripId, o el activo, o el primero
        let viajeActivo = null;
        if (currentTripId) {
            viajeActivo = viajes.find(v => v.id === currentTripId);
        }
        if (!viajeActivo) {
            viajeActivo = viajes.find(v => v.activo) || viajes[0];
            if (viajeActivo) {
                currentTripId = viajeActivo.id;
            }
        }
        
        if (viajeActivo) {
            currentTripName = viajeActivo.nombre;
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

// Modal para desbloquear bolso
function showUnlockModal(bagId) {
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
        lockedBags[bagId] = false;
        modal.style.display = 'none';
        render();
    };
    // Botón No
    document.getElementById('unlockBagNo').onclick = function() {
        modal.style.display = 'none';
    };
}
