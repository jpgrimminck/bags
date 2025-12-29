# Documento maestro de la app (vision funcional)

Este documento describe la app como un negocio con procesos, sin detalles tecnicos.

## 0) Proposito central y principios base

### Proposito central
- Reducir la carga mental asociada a salir, volver y el dia a dia, ayudando a las personas a no pensar en lo que ya resolvieron.
- La app acompaña. No controla. No insiste.

### Principios base
- La app piensa primero en hoy, no en viajes.
- Cada pantalla responde a una sola decision mental.
- Menos opciones visibles = mas tranquilidad.
- "Guardar" solo existe si se sabe donde va algo.
- "Pendiente" es una decision valida, no un error.
- Si el usuario dice "esta listo", la app le cree.

## 1) Flujos principales (lo que vive el usuario)

### A) Entrada diaria a la app (estado normal)
- Pantalla principal unica.
- Selector de dia (default: hoy). Permite elegir cualquier dia de la semana.
- Accion principal (default):
  - "Tus bolsos del dia" (ej: Martes - Bolso del nino).
  - Muestra el o los bolsos asignados al dia.
  - Incluye bolsos por default y bolsos de viajes asignados a ese dia.
  - Si hay mas de un bolso, se listan en una vista simple sin extras.
  - Barra de estado simple.
  - CTA grande: "Abrir bolso" (por bolso).
- Accion secundaria:
  - "Preparar otro viaje".
  - CTA: "Crear viaje".
- Accion terciaria (discreta):
  - "Pendientes" (ej: "3 cosas pendientes").
  - CTA: "Ver pendientes".
  - Nunca urgente. Nunca rojo.

### B) Plan semanal de bolsos (bolso por default)
- Se define un plan semanal con bolsos por dia de la semana.
- Cada dia puede tener uno o mas bolsos por default.
- Ejemplo:
  - Lunes, Miercoles, Viernes -> Mochila negra (5 items).
  - Martes -> Bolso gris (10 items).
- Al seleccionar un dia en la entrada diaria se muestran:
  - Bolsos por default de ese dia.
  - Bolsos de viajes asignados a ese dia.
- Si un bolso aparece por duplicado, se muestra una sola vez.
- Si se intenta usar un bolso del plan semanal en un viaje del mismo dia:
  - Se muestra advertencia.
  - Opciones: "No hare el plan semanal" (ese dia queda sin plan semanal) o "Utilizar otro bolso".

### C) Bolso del dia - estado "ya listo"
- Deteccion silenciosa si (aplica a cada bolso del dia):
  - El bolso estaba completo desde el dia anterior.
  - No hay items nuevos.
  - No hay pendientes asociados.
- La app no exige accion.
- Vista del bolso:
  - Texto arriba: "Este bolso ya esta listo."
  - Subtexto: "Lo dejaste preparado desde ayer."
- Accion principal:
  - Boton grande: "Tengo todo dentro".
  - Al tocarlo: marca todos los items del bolso como check hoy y actualiza timestamp.
  - No muestra listas.
  - Mensaje final: "Listo. Puedes irte."
  - Silencio despues, sin CTA adicional.
- Accion secundaria (muy discreta): "Abrir lista de todos modos".

### D) Onboarding (primeros 30 segundos, primer uso)
- Mensajes iniciales (max. 3):
  - "Nunca mas olvides algo importante al viajar."
  - "Cada persona sabe que llevar."
  - "Recorre tu casa una sola vez."
- Accion inmediata:
  - Entrar directo a un bolso demo con 5-6 items reales.
  - Unica accion visible: marcar un item.
  - Primer check = alivio, segundo check = confianza, tercero check = curiosidad.

### E) Flujo de ida (antes de salir)
- Vista Bolsos:
  - Bolsos por persona.
  - Barra de progreso.
  - Accion principal: marcar items.
- Vista Zonas (atajo):
  - Zonas editables (default: Dormitorio, Bano, Cocina).
  - Contador por zona.
  - Al terminar una zona:
    - Se colapsa sola.
    - Mensaje: "Zona lista".
    - Siguiente zona sugerida.
  - Cuando todas las zonas estan listas:
    - Mensaje: "Tu casa esta lista para salir."
    - Accion: "Revisar bolsos".
- No existe "cierre del viaje" explicito.

### F) Regreso del viaje
- Deteccion.
- Mensaje: "Ya volviste de este viaje?"
- Si responde "Si" -> entra a Modo Desarmar Bolsos.

### G) Modo desarmar bolsos
- Principio: no se recorren zonas. Se procesan bolsos, uno por uno, al ritmo real del usuario.
- Texto inicial: "Vamos bolso por bolso. Haz uno hoy, los otros despues."
- Al abrir un bolso, cada item tiene 3 acciones:
  1) Guardar en...
     - La app sugiere el lugar original.
     - El usuario confirma.
     - Guardar implica saber donde va.
  2) A lavado
     - Item sale del bolso.
     - Estado: Lavado.
     - El lavado no forma parte del flujo principal.
  3) Dejar pendiente
     - Item sale del bolso.
     - Estado: Pendiente.
     - Ubicacion temporal: Entrada.
     - No exige decision.
- Cosas nuevas:
  - Boton fijo: "+ Encontre algo nuevo".
  - Efecto: item nuevo, estado Pendiente, lugar Entrada, sin preguntas.
- Cierre de bolso:
  - Cuando todos los items estan Guardados, En lavado o Pendientes:
    - Mensaje: "Bolso listo."
    - Gesto mental implicito: doblar y guardar bolso.

### H) Pendientes (fuera de viajes y bolsos)
- Concepto: los pendientes viven fuera del sistema de viajes. Son orden domestico posterior.
- Son items del inventario con estado `pendiente`.
- Vista Pendientes:
  - Una sola lista.
  - Sin origen ni contexto.
  - Texto: "Pendiente de ordenar".
- Acciones por item (solo 2):
  1) Guardar en... (confirmar lugar y cerrar)
  2) Seguir pendiente (no pasa nada, sin presion, sin recordatorios intrusivos)
- Mensaje ocasional: "Tienes X cosas pendientes."

### I) Reglas finales de producto
- La app debe sentirse como: "Ya pense por ti. Esto es lo que toca hoy."
- Un buen flujo desaparece cuando ya cumplio.
- El final correcto es calma, no estimulo.
- Si la app empieza a molestar, fallo.

## 2) Cosas que maneja la app (objetos principales)

### A) Viajes (comportamiento esperado)
- Los viajes son eventos, no el centro de la app.
- Se crean desde "Preparar otro viaje" o "Mis Viajes" con el boton "Crear viaje".
- Datos obligatorios al crear:
  - Nombre del viaje.
  - Dia asignado (dia de la semana, exacto o aproximado).
  - Quienes van (solo familiares y mascotas; "Casa" no debe aparecer).
  - Bolsos que llevara.
  - Asignar items a cada bolso.
- Solo puede haber 1 viaje activo a la vez.
- No pueden existir 2 viajes con el mismo dia asignado (sea exacto o aproximado).
- Al crear el viaje:
  - Se asignan los items ya creados a bolsos especificos (segun el paso de asignacion).
  - Se redirige al viaje recien creado.
- Si el viaje tiene dia asignado, sus bolsos aparecen en la entrada diaria de ese dia.
- Si el viaje intenta usar un bolso del plan semanal en ese dia, se debe resolver el conflicto.
- El `id` del viaje es incremental.
- Guardado: por ahora en localStorage bajo la llave `viajes` (futuro: migrar a base de datos).

### B) Items (inventario) (comportamiento esperado)
- Un item es una cosa como "Toalla" o "Cargador".
- Cualquier familiar creado puede crear items.
- Campos posibles: id, name, description, category, bag, loc, zone, checked, icon, temperature, foto, owner.
- Campo obligatorio: solo `name`.
- Un item puede pertenecer a un familiar o a una mascota. Si no tiene dueno, se considera item de la Casa.
- Un mismo item puede estar asignado a varios viajes.
- El `checked` es por viaje (no global).
- El `id` del item debe ser incremental.
- Se guardan en localStorage bajo `inventory` cuando se persisten cambios.
- Un item puede tener zona asignada; si no, queda "Sin zona".
- Estados post-viaje:
  - `guardado`, `lavado`, `pendiente`, `en_bolso`.
  - "Guardar en..." requiere una ubicacion conocida; sugiere `loc` original.
  - "Pendiente" usa ubicacion temporal `Entrada`.

### C) Bolsos (comportamiento esperado)
- Todos los familiares pueden crear bolsos.
- Campo obligatorio: solo `nombre`.
- Los bolsos no tienen duenos.
- Los bolsos se asignan por viaje (no globales).
- No existen sub-bolsos (no se usa jerarquia padre/hijo).
- El progreso del bolso se basa en los items chequeados de ese viaje.
- Bolsos del dia:
  - Son los bolsos asignados al dia (plan semanal + viajes).
  - Se muestran en la entrada diaria segun el dia seleccionado.
  - Cada bolso mantiene timestamp de ultima confirmacion "Tengo todo dentro".

### D) Plan semanal de bolsos (comportamiento esperado)
- Mapea dia de la semana -> lista de bolsos por default.
- Cada dia puede tener uno o mas bolsos.
- Se edita desde Configuracion (o flujo de plan semanal).
- Es la base de "Tus bolsos del dia" en la entrada diaria.
- Se combina con viajes asignados a ese dia (sin duplicar bolsos).
- Si un viaje necesita un bolso del plan semanal de ese dia:
  - Se debe elegir: suspender el plan semanal de ese dia o usar otro bolso.
- Si se suspende el plan semanal, ese dia solo muestra bolsos del viaje.

### E) Relacion viaje-item-bolso (itemsTrips) (comportamiento esperado)
- Es la fuente de verdad para asignacion y estado por viaje.
- Debe existir un registro por cada item asignado a un bolso en ese viaje.
- Campos esperados: `tripId`, `itemId`, `bagId`, `checked`.
- Si un item no esta asignado a bolso en un viaje, no aparece en bolsos de ese viaje, pero sigue en inventario global.
- Persistencia: solo localStorage por ahora.

### F) Pendientes (comportamiento esperado)
- Son items del inventario con estado `pendiente`.
- Se alimentan desde Modo Desarmar o items nuevos encontrados.
- No requiere contexto u origen.

### G) Zonas (recoleccion) (comportamiento esperado)
- Zonas editables con nombre unico.
- Default: Dormitorio, Bano, Cocina.
- Los items deben poder agruparse por zona para la vista Zonas.
- Si una zona se elimina, sus items quedan "Sin zona" hasta reasignacion.

## 3) Donde vive la informacion (fuentes de datos) (comportamiento esperado)

### Mundo 1: JSON original
- Los JSON son solo plantilla inicial (semilla).
- Al hacer "reset", se recarga desde JSON.

### Mundo 2: Cambios locales (localStorage)
- Todo lo real se maneja desde localStorage.
- Debe persistir entre sesiones:
  - Viajes
  - Items
  - ItemsTrips
  - Bolsos
  - Familiares
  - Mascotas
  - Configuracion
  - Checked de item (por viaje)
  - Estado de bolso minimizado/expandido
  - Nuevos items creados
  - Items eliminados del bolso
  - Items agregados al bolso
  - Nuevo bolso creado
  - Scroll de vista de bolsos
  - Scroll de vista de items
  - Scroll de vista de recoleccion
  - Estado post-viaje de items (guardado/lavado/pendiente)
  - Plan semanal de bolsos (por dia)
  - Excepciones del plan semanal (dias suspendidos)
  - Zonas (lista editable)
  - Timestamp de "Tengo todo dentro"
  - Estado de onboarding (si ya se completo)
- No debe persistir:
  - Buscador
  - Modales abiertos

### Volver al original
- `clearLocalData()` borra todo y vuelve a cargar desde JSON.

## 4) Pantallas principales (lo que ve el usuario)

### Pantalla: Entrada diaria / Home (nueva principal)
- Pantalla principal unica con:
  - Selector de dia (default: hoy).
  - "Tus bolsos del dia" como accion principal.
  - "Preparar otro viaje" como accion secundaria.
  - "Pendientes" como accion terciaria discreta.
- Muestra bolsos por default + bolsos de viajes asignados al dia seleccionado.
- Si un viaje esta marcado como "dia aproximado", se muestra con etiqueta "Aprox".
- Nunca urgente. Nunca rojo.

### Pantalla: Viaje actual (`index.html`)
- Objetivo: operar el viaje ya creado y preparar la salida.
- Header con buscador:
  - Al escribir, debe buscar solo items asignados a ese viaje.
  - Debe mostrar: bolso asignado, dueno del item y estado check.
- Sidebar con secciones:
  - Viajes (Mis viajes).
  - Viaje Actual (Bolsos, Recoleccion).
  - Casa (Items).
  - Configuracion.

#### Vista 1: Bolsos
- Orden esperado de bolsos:
  1) Papá.
  2) Mamá.
  3) Hijos.
  4) Mascotas.
  5) Familiar.
  6) Casa.
- Cada tarjeta de bolso muestra:
  - Nombre, foto, progreso y cantidad de items.
  - Boton agregar item.
  - Lapiz con acciones: mover items, quitar items, cerrar bolso, eliminar bolso.
  - Items asignados al bolso y nombre del familiar del item.
  - Indicador si es un bolso compartido.
- Un bolso sin items igual se muestra (queda disponible para agregar).
- El progreso se calcula con items checkeados de ese bolso en ese viaje.
- Debe existir modo bloqueo para evitar eliminar items por error durante el viaje.
- Para quitar items se usa el lapiz; para modificar nombre se hace en Configuracion.

#### Vista 2: Recoleccion por zona
- Orden esperado: zonas ordenadas por la que tenga menos items asignados.
- Si hay items sin zona, se muestra un bloque "Sin zona" al final.
- Solo aparecen items del viaje actual.
- Dentro de cada zona, los items se agrupan por dueno.
- Cada item muestra: nombre, dueno, bolso y check.
- Se puede marcar check desde esta vista.
- Se colapsa una zona al terminarla y muestra "Zona lista".
- Debe sugerir la siguiente zona al cerrar una.
- Cuando todas las zonas estan listas:
  - Mensaje: "Tu casa esta lista para salir."
  - Accion: "Revisar bolsos".
- Debe persistir el scroll y el estado de check entre sesiones.
- Debe existir gestion de zonas (agregar/editar/eliminar).

#### Vista 3: Items
- Objetivo: ver items por persona y asignar.
- Orden esperado: los items se muestran siguiendo la misma regla de orden que los bolsos.
- Filtros: por viaje activo.
- Debe mostrar filtros con todos los viajes creados para ver rapidamente que items estan asignados a otros viajes.
- Al salir y volver, el filtro debe activarse con el viaje activo.
- Asignacion a bolso:
  - Al seleccionar un item, debe preguntar a que bolso asignarlo.
  - Debe mostrar bolsos ya creados dentro del viaje y la opcion de asignar a un nuevo bolso.
- Crear item:
  - Se puede crear un nuevo item desde aqui.
  - Aparece una tarjeta al final de cada familiar; al escribir y presionar Enter se crea asignado a ese familiar.
- Items sin dueno quedan asignados a la Casa.
- Se elimina el modo especial del viaje 1.

#### Vista 4: Configuracion
- Familiares: crear, editar nombre, definir categoria (papa/hijo/ninguna) y genero (hombre/mujer). Eliminar con precaucion.
- Mascotas: agregar, editar nombre, eliminar con precaucion.
- Bolsos: crear, editar nombre, adjuntar foto.
- Plan semanal: asignar bolsos por dia de la semana.
- Zonas: agregar, editar, eliminar.
- Sin opciones visuales.
- Seccion para sugerencias o reporte de fallos.

### Pantalla: Modo desarmar bolsos
- Se accede desde la deteccion de regreso del viaje.
- Procesa bolsos uno por uno (sin zonas).
- Cada item solo tiene 3 acciones: Guardar en..., A lavado, Dejar pendiente.
- Permite agregar items nuevos con "+ Encontre algo nuevo".
- Cierra el bolso con mensaje "Bolso listo." cuando no quedan items por decidir.

### Pantalla: Pendientes
- Lista unica sin origen ni contexto (items del inventario en estado `pendiente`).
- Acciones por item: Guardar en... o Seguir pendiente.
- Mensaje ocasional: "Tienes X cosas pendientes."

### Pantalla: Mis Viajes (`viajes.html`) (comportamiento esperado)
- Objetivo: crear un viaje nuevo con wizard (paso a paso).
- Pasos del wizard (orden):
  1) Crear nombre del nuevo viaje.
  2) Elegir dia del viaje (dia de la semana, exacto o aproximado).
  3) Elegir familiares que van (incluye mascotas).
  4) Elegir el/los bolsos que se llevaran.
  5) Asignar items a los bolsos elegidos.
  6) Crear viaje.
- Validaciones por paso:
  - Nombre: debe ser distinto a los ya creados y sin espacio al final.
  - Dia: debe ser un dia valido de la semana y puede marcarse como aproximado.
  - Dia: no puede existir otro viaje en ese mismo dia (exacto o aproximado).
  - Familiares: listar desde `family.json` (sin "Casa") y `pets.json`.
  - Bolsos: listar desde `bags.json`.
  - Asignacion: mostrar items ya creados por cada familiar.
- Comportamiento especial:
  - Desde cualquier paso, despues de escribir el nombre, se puede crear el viaje y terminarlo luego en la pestaña Bolsos.
  - No hay resumen final; el viaje se crea directo.
  - Al volver atras, debe conservar lo seleccionado previamente.
  - Cada paso debe mostrar un resumen de lo ya seleccionado (nombre, dia, familiares, bolsos).
  - Cada paso debe tener flecha de volver atras.
  - Si el nombre termina con punto o espacio, se elimina ese caracter al guardar.
  - Si se elige un bolso del plan semanal para ese dia, se muestra advertencia con opciones de resolver conflicto.
  - Cuando haya 2 botones en un paso, deben ir en la misma fila: el principal a la derecha con 2/3 del ancho y el secundario "Atras" a la izquierda con 1/3, estilo secundario (borde azul y texto negro).
  - En el paso final, "Crear viaje" debe usar el mismo estilo visual que el boton principal de pasos anteriores (azul y lleno) y ubicarse a la derecha, con "Atras" a la izquierda.

## 5) Acciones funcionales importantes (disparan bugs)

### A) Confirmar "Tengo todo dentro"
- Marca todos los items como check hoy para el bolso seleccionado del dia.
- Actualiza el timestamp de confirmacion del bolso.
- No muestra listas ni CTA adicional.

### B) Marcar item como listo (check)
- El item queda marcado como check solo para ese viaje.
- Se guarda en localStorage por ahora.

### C) Guardar item (modo desarmar)
- Requiere una ubicacion conocida (se sugiere la original).
- Saca el item del bolso y lo marca como `guardado`.

### D) Enviar item a lavado
- Saca el item del bolso y lo marca como `lavado`.

### E) Dejar item pendiente
- Saca el item del bolso y lo marca como `pendiente`.
- Ubicacion temporal: Entrada.

### F) Encontrar algo nuevo
- Crea item nuevo en estado `pendiente` con ubicacion Entrada.
- No pide preguntas adicionales.

### G) Modo asignacion (items a bolso)
- Un item puede quedar asignado a un bolso a traves de:
  - Crear un viaje.
  - Agregar un item con el boton "+ item" del bolso.
  - Entrar a Items y asignar un item a un bolso especifico.

### H) Crear item nuevo
- Debe pedir solo el nombre.

### I) Reset "JSON original"
- No debe pedir confirmacion.

### J) Crear viaje (wizard)
- Se permite crear sin terminar asignaciones.
- El dia puede quedar como aproximado.

### K) Definir bolsos por dia (plan semanal)
- Se asignan uno o mas bolsos por dia de la semana.
- Actualiza la entrada diaria y la seleccion de dia.

### L) Resolver conflicto plan semanal vs viaje
- Si un bolso del plan semanal se asigna a un viaje en el mismo dia, se muestra advertencia:
  - "No hare el plan semanal" (se suspende el plan semanal de ese dia), o
  - "Utilizar otro bolso" (se cambia el bolso del viaje).

### M) Seleccionar dia en entrada diaria
- Al cambiar el dia, se recalcula la lista de bolsos (plan semanal + viajes del dia).
- Si no hay bolsos para ese dia, se muestra un estado vacio simple.

### N) Agregar zona
- Se crea desde la gestion de zonas.
- Pide solo el nombre.
- No permite duplicados (comparacion simple).
- La zona nueva aparece con contador 0.

### O) Editar zona
- Permite renombrar la zona.
- Actualiza todos los items que estaban asociados a esa zona.
- Si el nombre existe, se bloquea la accion.

### P) Eliminar zona
- Si la zona esta vacia, se elimina directo.
- Si tiene items, se pide una sola decision:
  - Mover todos los items a otra zona, o
  - Dejarlos "Sin zona".

## 6) Mapa rapido de dependencias

- Entrada diaria -> usa dia seleccionado -> combina plan semanal + viajes asignados (salvo plan semanal suspendido) -> abre viaje actual con foco en el bolso elegido.
- Crear viaje (`viajes.html`) -> escribe `viajes` + `itemsTrips` -> abre `index.html?viaje=id`.
- Render usa `currentTripId` para filtrar y calcular progreso.
- Bolsos view usa `itemsTrips` (por viaje) + inventario para mostrar items.
- Toggle check escribe solo en `itemsTrips`.
- Asignacion a bolso escribe en `itemsTrips` y en inventario.
- Modo desarmar escribe estados `guardado/lavado/pendiente` -> alimenta la vista Pendientes.
- Gestion de zonas -> actualiza lista de zonas y reasigna items cuando corresponda.
- Conflicto plan semanal vs viaje -> advertencia -> suspende plan semanal del dia o cambia bolso del viaje.

---

Si quieres que este documento evolucione con los cambios, puedo actualizarlo en cada commit.
