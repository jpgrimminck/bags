# VIOLATIONS — Ocurrencias que violan `CHAT_RULES.md`

Resumen
- Búsqueda usada: cadenas/regex `@media|md:|lg:|sm:|xl:` en archivos `*.html, *.js, *.css, *.md`.
- Total de coincidencias encontradas: 177 (resultado capado en 200).
- Archivos con coincidencias (ejemplos): `app.js`, `items.html`, `recoleccion.html`, `Viajes.html`, `configuracion.html`, `CHAT_RULES.md` (esta última contiene el propio texto que menciona los prefijos).

Importante
- Muchas coincidencias están dentro de strings de plantillas en `app.js` que generan markup con clases responsivas (`md:`, `lg:`, etc.). Esas deben revisarse manualmente y reemplazarse por clases globales o por clases no-responsivas.
- También hay modales y botones en varios `*.html` que usan `md:items-center`, `md:w-11/12`, `md:hidden`, `md:w-auto`, etc. Deben reemplazarse por versiones globales (ej.: `items-center`, `w-full`, `hidden` o restructurar el markup para que no dependa de breakpoints).

Muestras representativas (archivo:line — snippet)
- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:471
  html += '<li class="sticky top-[195px] md:static z-[5] bg-white text-xs text-gray-400 pt-3 pb-1 flex items-center gap-1.5 -mx-4 px-4">' +

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:525
  <h2 class="text-2xl md:text-3xl font-bold text-gray-800">🏠 Recolección por Zona</h2>

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:657
  <h3 class="sticky top-[115px] z-20 bg-gray-100 text-lg font-bold text-gray-700 py-2 px-1 -mx-1 flex items-center gap-2 md:static md:bg-transparent md:py-0 md:px-0 md:mx-0 md:mb-3">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:857
  <div class="sticky top-[52px] z-30 bg-blue-600 text-white py-3 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-12 xl:px-12 mb-4 rounded-lg shadow-lg">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:981
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50';

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/app.js:1203
  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/items.html:164
  <div id="modal-zona" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-end md:items-center justify-center z-50">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/items.html:165
  <div class="bg-white rounded-t-2xl md:rounded-lg p-6 w-full md:w-11/12 max-w-sm shadow-xl">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/items.html:173
  <button onclick="closeZonaModal()" class="text-gray-500 px-4 py-3 w-full md:w-auto rounded-lg border border-gray-200">Cancelar</button>

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/recoleccion.html:164
  <div id="modal-zona" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-end md:items-center justify-center z-50">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/recoleccion.html:165
  <div class="bg-white rounded-t-2xl md:rounded-lg p-6 w-full md:w-11/12 max-w-sm shadow-xl">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/Viajes.html:98
  <div id="app" class="w-full mx-auto p-4 md:p-6 lg:px-8 xl:px-12 mt-14">

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/Viajes.html:101
  <h2 class="text-2xl md:text-3xl font-bold text-gray-800">¿Dónde irás hoy?</h2>

- /Users/macbookpro/Library/CloudStorage/OneDrive-Personal/Web Viajes Juan Pablo/configuracion.html:106
  <div id="app" class="w-full mx-auto p-4 md:p-6 lg:px-8 xl:px-12 mt-14">


Recomendaciones / siguientes pasos
1. Revisar manualmente cada ocurrencia en `app.js` (plantillas):
   - Reemplazar clases con prefijos (`md:`, `lg:`, `xl:`, `sm:`) por su equivalente no-responsivo o mover la lógica visual a CSS global (ej.: `desktop-grid-x`).
   - Evitar usar `md:hidden`/`md:block` — en su lugar, reestructurar la disposición o usar clases globales `hidden`/`block` según corresponda.

2. En los `*.html` (modales, botones):
   - Cambiar `md:items-center` → `items-center` y `md:w-11/12` → `w-full` o `max-w-*` según convenga.
   - Eliminar `md:hidden` dentro de `div` que generan barra de arrastre y usar `display` consistente o alterar el DOM para mostrar/ocultar con la misma clase en todos los tamaños.

3. Proponer parches automáticos (opcional):
   - Reemplazos simples y seguros: eliminar prefijos `md:`, `lg:`, `sm:`, `xl:` dentro de atributos `class="..."` y reemplazar `md:w-auto`/`md:w-11/12` por `w-auto`/`w-full`.
   - Reemplazos no triviales: `grid grid-cols-2 md:grid-cols-3` debería transformarse a una sola clase global tipo `desktop-grid-x` y actualizar el CSS para soportarla.

4. Validación visual: después de aplicar cambios, abrir `index.html`, `items.html`, `recoleccion.html` y `Viajes.html` en el navegador y verificar que el layout se comporta fluidamente (grid auto-fit, modals se centran, botones visibles y orden correcto).

Comandos útiles para búsqueda local rápida
```
# buscar prefijos responsivos y @media
grep -R "@media\|md:\|lg:\|sm:\|xl:" -n --include="*.html" --include="*.js" --include="*.css" .
```

Notas
- `CHAT_RULES.md` ya contiene la regla principal; `VIOLATIONS.md` sirve como listado operativo.
- ¿Quieres que aplique parches automáticos para reemplazos sencillos (p.ej. eliminar `md:`/`lg:` y convertir grids a `desktop-grid-x` donde sea directo)? Si me confirmas, puedo generar un patch con cambios sugeridos y dejar los casos complejos como comentarios.

---
Archivo generado automáticamente por el asistente — contiene una muestra y recomendaciones. Para ver el listado completo línea por línea puedo generar una versión extendida con todas las 177 coincidencias si la deseas.
