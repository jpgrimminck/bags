import { state } from './state.js';
import { getItemsForBag, getBagAssignment, applyInlineCardGapIfNeeded } from './utils.js';
import { ITEM_CATEGORIES, DEFAULT_BAG_IMAGE } from './constants.js';

// --- LÓGICA DE RENDERIZADO ---

export function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    
    // Actualizar estadísticas del header
    updateHeaderStats();
    
    // Actualizar contador de cambios locales
    updateLocalChangesCounter();

    if (state.currentTab === 'bolsos') renderBolsosView(app);
    else if (state.currentTab === 'zonas') renderZonasView(app);
    else if (state.currentTab === 'inventario') renderInventarioView(app);
    else if (state.currentTab === 'config') renderConfigView(app);
}

// VISTA 1: BOLSOS
export function renderBolsosView(container) {
    // Contenedor de bolsos por familiar
    container.innerHTML += `<div id="bagsContainer"></div>`;

    // Renderizar bolsos
    renderBagsContent();
}

export function renderBagsContent() {
    const bagsContainer = document.getElementById('bagsContainer');
    if (!bagsContainer) return;
    
        // Obtener IDs de bolsos que tienen items en el viaje actual
        const bagsWithItemsInTrip = [...new Set(
            state.itemsTrips.filter(it => it.tripId === state.currentTripId).map(it => it.bagId)
        )];
    
        // Filtrar solo bolsos principales que tienen items en este viaje
        const mainBags = state.bags.filter(b => !b.parentId && bagsWithItemsInTrip.includes(b.id));

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
                    const member = state.familyMembers.find(m => m.name === name);
                    return member ? member.id : null;
                }).filter(id => id !== null),
                icons: assignment.names.map(name => {
                    const member = state.familyMembers.find(m => m.name === name);
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
                const fam = state.familyMembers.find(f => f.id === id);
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
            <h3 class="sticky top-[52px] z-20 bg-gray-100 text-2xl font-bold text-gray-700 py-1.5 px-4 flex items-center gap-2 border-b mb-3 pb-2">
                <span class="flex items-center gap-1 flex-shrink-0">${iconsHTML}</span>
                <span class="whitespace-nowrap">${sectionTitle}</span>
            </h3>
                <div class="desktop-grid-x">
        `;

        group.bags.forEach(bag => {
            // Encontrar sub-bolsos
            const subBags = state.bags.filter(b => b.parentId === bag.id);
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

            const isEditMode = state.editingBags[bag.id] || false;
            const isExpanded = state.expandedBags[bag.id] !== false;
            const expandedClass = isExpanded ? '' : 'hidden';
            const isLocked = state.lockedBags[bag.id] || false;
            const isMenuOpen = state.openBagMenu === bag.id;
            const isEditingName = state.editingBagName === bag.id;
            const isRemovingMode = state.removingFromBag[bag.id] || false;
            
            gridHTML += `
                        <div class="bg-white rounded-xl shadow bag-card ${completeBorder} relative ${isLocked ? 'bag-locked-border' : ''} mt-0_5" id="bag-card-${bag.id}">
                <!-- Header sticky del bolso -->
                <div class="sticky top-[96px] static bg-white rounded-t-xl z-10 p-4 pb-2 cursor-pointer cursor-default" onclick="toggleBagExpand('${bag.id}')">
                    <!-- Título e ícono -->
                    <div class="flex justify-between items-center mb-2 bag-title-area">
                        <div class="flex items-center">
                            <img src="${bag.photo || DEFAULT_BAG_IMAGE}" alt="${bag.name}" onerror="this.src='${DEFAULT_BAG_IMAGE}'; this.onerror=null" class="w-12 h-12 w-14 h-14 rounded-lg object-cover mr-3">
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
                                    class="px-3 py-1_5 flex items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium transition-colors hover:bg-green-600">
                                    <i class="fa-solid fa-lock mr-1"></i> <span class="font-medium text-sm">Cerrado</span>
                                </button>
                                ` : isRemovingMode ? `
                                <!-- Modo quitar items: botón Listo -->
                                <button onclick="event.stopPropagation(); cancelRemovingItems('${bag.id}')"
                                    class="px-3 py-1_5 flex items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium transition-colors hover:bg-green-600">
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
                                <a href="items.html?viaje=${state.currentTripId}&bolso=${bag.id}&modo=asignar"
                                    onclick="event.stopPropagation();"
                                    class="px-3 py-1_5 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-medium transition-colors hover:bg-blue-600">
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
                                    const fam = state.familyMembers.find(f => f.id === parseInt(ownerId) || f.id === ownerId);
                                    const pet = state.pets.find(p => p.id === parseInt(ownerId) || p.id === ownerId);
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
                                if (state.groupByCategory) {
                                    const itemsByCategory = {};
                                    ITEM_CATEGORIES.forEach(cat => itemsByCategory[cat.id] = []);
                                    ownerItems.forEach(item => {
                                        const cat = item.category || 'otros';
                                        if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                                        itemsByCategory[cat].push(item);
                                    });
                                    
                                    ITEM_CATEGORIES.forEach(cat => {
                                        const catItems = itemsByCategory[cat.id];
                                        if (catItems && catItems.length > 0) {
                                            html += '<li class="text-xs font-bold text-gray-500 pt-2 pb-1 border-b border-gray-100 ml-4">' + cat.icon + ' ' + cat.name + '</li>';
                                            catItems.sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach(item => {
                                                const itemBag = state.bags.find(b => b.id === item.bag);
                                                const isSubBag = itemBag.id !== bag.id;
                                                html += createItemRow(item, isSubBag, itemBag, isEditMode, bag.id, isRemovingMode);
                                            });
                                        }
                                    });
                                } else {
                                    ownerItems.sort((a, b) => a.name.localeCompare(b.name, 'es')).forEach(item => {
                                        const itemBag = state.bags.find(b => b.id === item.bag);
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
export function renderZonasView(container) {
    container.innerHTML += `
        <div class="mb-6">
            <h2 class="text-3xl font-bold text-gray-800">🏠 Recolección por Zona</h2>
            <p class="text-sm text-gray-500">Recorre la casa una sola vez.</p>
        </div>`;

    const locations = [...new Set(state.inventory.map(i => i.loc))].sort();

    if(locations.includes('Comprar')) {
        locations.splice(locations.indexOf('Comprar'), 1);
        locations.unshift('Comprar');
    }

    let gridHTML = '<div class="desktop-grid-x">';

    locations.forEach(loc => {
        const locItems = state.inventory.filter(i => i.loc === loc);
        const allChecked = locItems.length > 0 && locItems.every(i => i.checked);
        const checkedCount = locItems.filter(i => i.checked).length;
        const locColor = loc === 'Comprar' ? 'text-red-600' : 'text-gray-800';
        const locIcon = loc === 'Comprar' ? '<i class="fa-solid fa-cart-shopping"></i>' : '<i class="fa-solid fa-location-dot"></i>';
        const completeBorder = allChecked ? 'ring-2 ring-green-400' : '';

        const itemsHTML = locItems.map(item => {
            const targetBag = state.bags.find(b => b.id === item.bag);
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
export function renderInventarioView(container) {
     // Si estamos en modo asignación, mostrar header especial
     const assignModeBag = state.assignModeActive ? state.bags.find(b => b.id === state.assignModeBagId) : null;
     
     // Activar filtro del viaje actual por defecto si no hay filtro activo y no fue desactivado manualmente
     if (!state.assignModeActive && state.currentTripId && state.tripFilterActive === null && !state.userDisabledFilter) {
         state.tripFilterActive = state.currentTripId;
     }
     
     // Obtener dueños actuales del bolso (basado en items ya asignados)
     let bagOwners = [];
     let bagOwnerNames = [];
     if (state.assignModeActive && state.assignModeBagId) {
         const bagAssignment = getBagAssignment(state.assignModeBagId);
         bagOwnerNames = bagAssignment.names || [];
         bagOwners = bagOwnerNames.map(name => state.familyMembers.find(m => m.name === name)).filter(m => m);
     }
     
     const itemsByFamily = {};
     
     // Crear categorías para miembros tipo persona y mascota
     state.familyMembers.filter(m => m.type === 'persona' || m.type === 'mascota').forEach(member => {
         itemsByFamily[member.name] = [];
     });
     // Agregar Casa como categoría separada
     itemsByFamily['Casa'] = [];
     
     state.inventory.forEach(item => {
         // Usar owner para determinar el dueño del item
         const ownerMember = state.familyMembers.find(m => m.id === item.owner);
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
     const assignedItemIds = state.itemsTrips
         .filter(it => it.tripId === state.currentTripId)
         .map(it => it.itemId);
     
     let familyGroupsHTML = '';
     
     // Ordenar: primero personas, luego mascotas, luego Casa
     let orderedKeys = [
         ...state.familyMembers.filter(m => m.type === 'persona').map(m => m.name),
         ...state.familyMembers.filter(m => m.type === 'mascota').map(m => m.name),
         'Casa'
     ];
     
     // En modo asignación, reordenar para mostrar primero los dueños del bolso
     let primaryOwners = [];
     let secondaryOwners = [];
     
     if (state.assignModeActive && bagOwnerNames.length > 0) {
         primaryOwners = orderedKeys.filter(name => bagOwnerNames.includes(name));
         secondaryOwners = orderedKeys.filter(name => !bagOwnerNames.includes(name));
     } else {
         primaryOwners = orderedKeys;
     }
     
     // Función para renderizar una sección de familiar
     const renderFamilySection = (familyName, showCreateButton = false) => {
         const items = itemsByFamily[familyName];
        if (state.assignModeActive && (!items || items.length === 0)) {
            // Si se estableció supresión de enlaces de creación (por redirect), no renderizar el bloque
            if (state.suppressFamilyCreateLinks) {
                return '';
            }
            // Si no hay items pero estamos en modo asignación, mostrar solo el botón crear
            if (state.assignModeActive) {
                const member = state.familyMembers.find(m => m.name === familyName);
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
         
         const member = state.familyMembers.find(m => m.name === familyName);
         const memberIcon = member ? member.icon : '🏠';
         const memberId = member ? member.id : null;
         
         // En modo asignación, filtrar solo items NO asignados al viaje
         let displayItems = items;
         if (state.assignModeActive) {
             displayItems = items.filter(item => !assignedItemIds.includes(item.id) || state.pendingAssignItems.includes(item.id));
         }
         
         const sortedItems = [...displayItems].sort((a, b) => a.name.localeCompare(b.name, 'es'));
         
         // Crear tarjeta de creación
         let createCardHTML = '';
         if (!state.assignModeActive) {
             if (state.creatingItemForOwner === familyName) {
                 const borderColor = state.newItemMatches.length === 0 ? 'border-blue-500' : 'border-red-500';
                 const showCreateButton = state.newItemMatches.length === 0 && state.newItemText.trim();
                 createCardHTML = `
                 <div class="bg-white rounded-lg shadow p-3 border-2 ${borderColor} flex flex-col gap-2 create-item-card" style="min-height: 52px;">
                     <input id="create-input-${familyName}" type="text" value="${state.newItemText}" oninput="updateNewItemText(this.value)" onkeydown="if(event.key==='Enter'){createNewItem();}else if(event.key==='Escape'){cancelCreateItem();}" 
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
         const allItemsAssigned = state.assignModeActive && displayItems.length === 0;
         
         let sectionTitle = `ITEMS DE ${familyName.toUpperCase()}`;
         if (familyName === 'Papá') sectionTitle = 'ITEMS DEL PAPÁ';
         if (familyName === 'Mamá') sectionTitle = 'ITEMS DE LA MAMÁ';
         if (familyName === 'Casa') sectionTitle = 'ITEMS DE LA CASA';
         
         // Contador: en modo asignación mostrar items disponibles, sino total
         const itemCount = state.assignModeActive ? displayItems.length : items.length;
         
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
                 <div class="desktop-grid-x items-grid" onclick="${state.creatingItemForOwner === familyName ? `if(!event.target.closest('.create-item-card')) cancelCreateItem();` : ''}">
                 ${sortedItems.map(item => {
                     const isAssigned = assignedItemIds.includes(item.id);
                     const isFilterActive = state.tripFilterActive !== null || state.assignModeActive;
                     const isHighlighted = state.creatingItemForOwner === familyName && state.newItemMatches.includes(item);
                     
                     // Determinar estilo y acción según modo
                     let cardBg, clickAction, cursorClass, rightIcon;
                     
                     if (state.assignModeActive) {
                         // Modo asignación a bolso
                         const isPendingAssign = state.pendingAssignItems.includes(item.id);
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
                     } else if (state.tripFilterActive === 1) {
                         // Modo selección para viaje Algarrobo
                         const isSelected = state.selectedItemsForTrip.includes(item.id);
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
                     
                     const textColor = (state.assignModeActive && state.pendingAssignItems.includes(item.id)) || (state.tripFilterActive === 1 && state.selectedItemsForTrip.includes(item.id)) ? 'text-white' : 'text-gray-800';
                     return `
                     <div class="${cardBg} rounded-lg shadow p-3 hover:shadow-md transition-shadow flex justify-between items-center gap-2 ${cursorClass}" style="min-height: 52px;" ${clickAction}>
                         <span class="text-sm font-medium ${textColor} text-left truncate">${item.name}</span>
                         ${rightIcon}
                     </div>
                 `}).join('')}
                 ${createCardHTML}
             </div>
             ${state.assignModeActive && !state.suppressFamilyCreateLinks ? `
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
     if (state.assignModeActive && secondaryOwners.length > 0) {
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
     if (state.assignModeActive && assignModeBag) {
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
                 <img src="${assignModeBag.photo || DEFAULT_BAG_IMAGE}" onerror="this.src='${DEFAULT_BAG_IMAGE}'; this.onerror=null" class="w-10 h-10 rounded-lg object-cover">
                 <div class="flex-1">
                     <p class="font-bold text-lg flex items-center gap-2">${headerText} ${ownersIconsHTML}</p>
                 </div>
             </div>
         </div>`;
     } else {
         headerHTML = `
         <div class="sticky top-[65px] z-30 bg-gray-100 py-3 -mx-4 px-4 mb-4">
             <div class="flex flex-wrap gap-2 overflow-x-auto">
                 ${state.allTrips.map(trip => `
                     <button onclick="toggleTripFilter(${trip.id})" id="btn-trip-filter-${trip.id}" 
                         class="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap
                         ${state.tripFilterActive === trip.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                         <i class="fa-solid fa-suitcase"></i> ${trip.nombre}
                     </button>
                 `).join('')}
             </div>
         </div>`;
     }
     
    // Botón flotante para volver a bolsos (solo en modo asignación)
    let floatingButtonHTML = '';
    if (state.assignModeActive) {
        const pendingCount = state.pendingAssignItems.length;

        if (pendingCount > 0) {
            // Agrupar items pendientes por dueño
            const pendingByOwner = {};
            state.pendingAssignItems.forEach(itemId => {
                const item = state.inventory.find(i => i.id === itemId);
                if (item) {
                    const ownerMember = state.familyMembers.find(m => m.id === item.owner);
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
            const buttonAction = `onclick="${pendingCount > 0 ? 'confirmPendingItems()' : `window.location.href='index.html?viaje=${state.currentTripId}'` }"`;
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
            const backAction = `onclick="window.location.href='index.html?viaje=${state.currentTripId}'"`;
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
    } else if (state.tripFilterActive === 1 && state.selectedItemsForTrip.length > 0) {
        const selectedCount = state.selectedItemsForTrip.length;
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

// VISTA 4: CONFIGURACIÓN
export function renderConfigView(container) {
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
                <button onclick="toggleGroupByCategory()" class="relative w-14 h-8 rounded-full transition-colors ${state.groupByCategory ? 'bg-green-500' : 'bg-gray-300'}">
                    <span class="absolute top-1 ${state.groupByCategory ? 'right-1' : 'left-1'} w-6 h-6 bg-white rounded-full shadow transition-all"></span>
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
                ${state.familyMembers.filter(m => m.type === 'persona').map(member => `
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
                ${state.pets.length > 0 ? state.pets.map(pet => `
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
                ${state.bags.map(bag => {
                    const parentBag = state.bags.find(b => b.id === bag.parentId);
                    const locationText = parentBag 
                        ? `<span class="text-gray-600"><i class="fa-solid fa-level-up-alt rotate-90"></i> En: ${parentBag.name}</span>` 
                        : '<span class="text-green-600">Principal</span>';
                    
                    return `
                    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <img src="${bag.photo || DEFAULT_BAG_IMAGE}" alt="${bag.name}" onerror="this.src='${DEFAULT_BAG_IMAGE}'; this.onerror=null" class="w-10 h-10 rounded-lg object-cover">
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
export function createItemRow(item, showBagInfo = false, bagData = null, editMode = false, bagId = null, removeMode = false) {
    const checkedClass = item.checked ? 'line-through text-gray-400' : 'text-gray-800';
    const bagBadge = (showBagInfo && bagData) ? `<span class="text-[10px] bg-blue-100 text-blue-800 px-1 rounded ml-2 inline-flex items-center gap-1"><img src="${bagData.photo || 'bag-default.jpg'}" class="w-3 h-3 rounded object-cover"> ${bagData.name}</span>` : '';
    const descriptionHTML = item.description ? `<div class="text-[11px] text-gray-400 mt-0_5">${item.description}</div>` : '';
    const isBeingEdited = state.editingItemId === item.id;
    const effectiveBagId = bagId || item.bag;
    const isLocked = state.lockedBags[effectiveBagId];
    
    // Verificar si este item fue recientemente asignado (para animación)
    const isHighlighted = state.newlyAssignedItems.includes(item.id);
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
        const catOptions = ITEM_CATEGORIES.map(c => 
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

export function updateHeaderStats() {
    // Contar solo items del viaje actual
    const tripItems = state.itemsTrips.filter(it => it.tripId === state.currentTripId);
    const totalItems = tripItems.length;
    const totalChecked = tripItems.filter(it => it.checked).length;
    const countEl = document.getElementById('headerItemCount');
    if (countEl) countEl.textContent = `${totalChecked}/${totalItems}`;
}

// Contar cambios locales almacenados
function countLocalChanges() {
    return 0; // Sin localStorage, siempre 0
}

// Actualizar el contador de cambios locales en el menú
export function updateLocalChangesCounter() {
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

export function updateHeaderCounter() {
    const tripItems = state.itemsTrips.filter(it => it.tripId === state.currentTripId);
    const totalItems = tripItems.length;
    const checkedItems = tripItems.filter(it => it.checked).length;
    const counterEl = document.getElementById('headerItemCount');
    if (counterEl) {
        counterEl.textContent = `${checkedItems}/${totalItems}`;
    }
}

export function updateBagProgress(bagId) {
    const bagItems = state.itemsTrips.filter(it => it.tripId === state.currentTripId && it.bagId == bagId);
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
        const isLocked = state.lockedBags[bagId] || false;
        bagCard.className = `bg-white rounded-xl shadow bag-card ${completeBorder} relative ${isLocked ? 'bag-locked-border' : ''} mt-0_5`;
    }
}

export function updateSearchResults(value) {
    state.searchTerm = value;
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
        const searchResults = state.inventory.filter(item => 
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
            const itemBag = state.bags.find(b => b.id === item.bag);
            const bagName = itemBag ? itemBag.name : 'Sin asignar';
            const bagPhoto = itemBag ? itemBag.photo : null;
            const checkedClass = item.checked ? 'bg-green-50' : '';
            const textClass = item.checked ? 'line-through text-gray-400' : 'text-gray-800';
            
            let familyIcons = '';
            if (itemBag && itemBag.assignedTo) {
                const assignees = Array.isArray(itemBag.assignedTo) ? itemBag.assignedTo : [itemBag.assignedTo];
                familyIcons = assignees.map(name => {
                    const member = state.familyMembers.find(m => m.name === name);
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
