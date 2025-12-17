// Rendering functions moved from app.js
import { state } from './state.js';
import { applyInlineCardGapIfNeeded } from './utils.js';

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
            <h3 class="sticky top-[52px] z-20 bg-gray-100 text-xl text-2xl font-bold text-gray-700 py-1.5 px-1 -mx-1 flex flex-wrap items-center gap-x-2 gap-y-0 border-b static bg-transparent py-0 px-0 mx-0 mb-3 pb-2">
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
                                    onkeydown="if(event.key==='Enter'){saveBagName('${bag.id}', event);} if(event.key==='Escape'){cancelEditBagName(event);}"}>
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
                                <a href="items.html?viaje=${state.currentTripId}&bolso=${bag.id}&modo=asignar" 
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
                                    state.itemCategories.forEach(cat => itemsByCategory[cat.id] = []);
                                    ownerItems.forEach(item => {
                                        const cat = item.category || 'otros';
                                        if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                                        itemsByCategory[cat].push(item);
                                    });

                                    state.itemCategories.forEach(cat => {
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

// Other render functions would go here, but for brevity, I'll stop here.

export { renderBolsosView, renderBagsContent };