# Documento maestro de la app (vision funcional)

Este documento describe la app como un negocio con procesos, sin detalles tecnicos.

## 1) Cosas que maneja la app (objetos principales)

### A) Viajes (comportamiento esperado)
- Se crean desde "Mis Viajes" con el boton "Nuevo viaje".
- Datos obligatorios al crear:
  - Nombre del viaje.
  - Quienes van (solo familiares y mascotas; "Casa" no debe aparecer).
  - Bolsos que llevara.
  - Asignar items a cada bolso.
- Solo puede haber 1 viaje activo a la vez.
- Al crear el viaje:
  - Se asignan los items ya creados a bolsos especificos (segun el paso de asignacion).
  - Se redirige al viaje recien creado.
- El `id` del viaje es incremental.
- Guardado: por ahora en localStorage bajo la llave `viajes` (futuro: migrar a base de datos).

### B) Items (inventario) (comportamiento esperado)
- Un item es una cosa como "Toalla" o "Cargador".
- Cualquier familiar creado puede crear items.
- Campos posibles: id, name, description, category, bag, loc, checked, icon, temperature, foto, owner.
- Campo obligatorio: solo `name`.
- Un item puede pertenecer a un familiar o a una mascota. Si no tiene dueno, se considera item de la Casa.
- Un mismo item puede estar asignado a varios viajes.
- El `checked` es por viaje (no global).
- El `id` del item debe ser incremental.
- Se guardan en localStorage bajo `inventory` cuando se persisten cambios.

### C) Bolsos (comportamiento esperado)
- Todos los familiares pueden crear bolsos.
- Campo obligatorio: solo `nombre`.
- Los bolsos no tienen duenos.
- Los bolsos se asignan por viaje (no globales).
- No existen sub-bolsos (no se usa jerarquia padre/hijo).
- El progreso del bolso se basa en los items chequeados de ese viaje.

### D) Relacion viaje-item-bolso (itemsTrips) (comportamiento esperado)
- Es la fuente de verdad para asignacion y estado por viaje.
- Debe existir un registro por cada item asignado a un bolso en ese viaje.
- Campos esperados: `tripId`, `itemId`, `bagId`, `checked`.
- Si un item no esta asignado a bolso en un viaje, no aparece en bolsos de ese viaje, pero sigue en inventario global.
- Persistencia: solo localStorage por ahora.

## 2) Donde vive la informacion (fuentes de datos) (comportamiento esperado)

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
  
- No debe persistir:
  - Buscador
  - Modales abiertos

### Volver al original
- `clearLocalData()` borra todo y vuelve a cargar desde JSON.

## 3) Pantallas principales (lo que ve el usuario)

### Pantalla: Mis Viajes (`viajes.html`) (comportamiento esperado)
- Objetivo: crear un viaje nuevo con wizard (paso a paso).
- Pasos del wizard (orden):
  1) Crear nombre del nuevo viaje.
  2) Elegir familiares que van (incluye mascotas).
  3) Elegir el/los bolsos que se llevaran.
  4) Asignar items a los bolsos elegidos.
  5) Crear viaje.
- Validaciones por paso:
  - Nombre: debe ser distinto a los ya creados y sin espacio al final.
  - Familiares: listar desde `family.json` (sin "Casa") y `pets.json`.
  - Bolsos: listar desde `bags.json`.
  - Asignacion: mostrar items ya creados por cada familiar.
- Comportamiento especial:
  - Desde cualquier paso, despues de escribir el nombre, se puede crear el viaje y terminarlo luego en la pestaña Bolsos.
  - No hay resumen final; el viaje se crea directo.
  - Al volver atras, debe conservar lo seleccionado previamente.
  - Cada paso debe mostrar un resumen de lo ya seleccionado (nombre, familiares, bolsos).
  - Cada paso debe tener flecha de volver atras.
  - Si el nombre termina con punto o espacio, se elimina ese caracter al guardar.
  - Cuando haya 2 botones en un paso, deben ir en la misma fila: el principal a la derecha con 2/3 del ancho y el secundario "Atrás" a la izquierda con 1/3, estilo secundario (borde azul y texto negro).
  - En el paso final, "Crear viaje" debe usar el mismo estilo visual que el botón principal de pasos anteriores (azul y lleno) y ubicarse a la derecha, con "Atrás" a la izquierda.

### Pantalla: Viaje actual (`index.html`)
- Objetivo: operar el viaje ya creado.
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
- Solo aparecen items del viaje actual.
- Dentro de cada zona, los items se agrupan por dueno.
- Cada item muestra: nombre, dueno, bolso y check.
- Se puede marcar check desde esta vista.
- Debe persistir el scroll y el estado de check entre sesiones.

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
- Sin opciones visuales.
- Seccion para sugerencias o reporte de fallos.

## 4) Acciones funcionales importantes (disparan bugs)

### A) Marcar item como listo (check)
- El item queda marcado como check solo para ese viaje.
- Se guarda en localStorage por ahora.

### B) Modo asignacion (items a bolso)
- Un item puede quedar asignado a un bolso a traves de:
  - Crear un viaje.
  - Agregar un item con el boton "+ item" del bolso.
  - Entrar a Items y asignar un item a un bolso especifico.

### C) Crear item nuevo
- Debe pedir solo el nombre.

### D) Reset "JSON original"
- No debe pedir confirmacion.

### E) Crear viaje (wizard)
- Se permite crear sin terminar asignaciones.

## 5) Mapa rapido de dependencias

- Crear viaje (viajes.html) -> escribe `viajes` + `itemsTrips` -> abre `index.html?viaje=id`.
- Render usa `currentTripId` para filtrar y calcular progreso.
- Bolsos view usa `itemsTrips` (por viaje) + inventario para mostrar items.
- Toggle check escribe solo en `itemsTrips`.
- Asignacion a bolso escribe en `itemsTrips` y en inventario.

---

Si quieres que este documento evolucione con los cambios, puedo actualizarlo en cada commit.
