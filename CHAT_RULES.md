# CHAT_RULES — Reglas que el asistente debe leer y mantener

**Propósito**
Este archivo contiene las reglas de estilo y comportamiento que el asistente (chat) debe leer antes de proponer o aplicar cambios visuales. Su objetivo es asegurar que todas las modificaciones visuales sean globales y no dependan del ancho del viewport.

**Regla principal**
- No deben existir modificaciones visuales en el código que dependan del ancho del viewport (breakpoints). Todas las decisiones visuales deben aplicarse globalmente de modo que una sola modificación se refleje en todas las pantallas.

Reglas concretas
- Evitar media queries que condicionen cambios visuales (por ejemplo `@media (min-width: ...)` o `@media (max-width: ...)`) para comportamientos visuales que deban ser compartidos entre pantallas.
- Evitar clases utilitarias responsivas que introduzcan cambios visuales distintos por breakpoint (por ejemplo `md:`, `lg:`, `sm:`, `xl:` en marcados tipo Tailwind).
- Preferir layouts fluidos basados en CSS Grid/Flex con técnicas como `repeat(auto-fit, minmax(...))`, `max-width`, porcentajes o `min()`/`max()` para que el diseño se adapte sin reglas breakpoint.
- No usar anchos fijos condicionados por media queries (por ejemplo `width: 420px` dentro de un `@media`).
- Cuando un componente necesite conducta específica por tamaño *por motivos funcionales* (no visuales), documentarlo explícitamente en el componente y justificar por qué no se pudo lograr de forma fluida.

Prácticas recomendadas
- Crear clases utilitarias globales (ej.: `.desktop-grid-x`) que implementen grid fluidos usando `auto-fit`/`minmax` y usar esas clases en todas las vistas.
- Mantener los estilos en `styles.css` (o archivo global) y evitar duplicar estilos condicionados en cada HTML/JS template.
- En los templates de JavaScript, evitar incluir prefijos responsivos (`md:`, `lg:`) dentro de los strings que generan markup.
- Preferir controles de visibilidad basados en flujo y orden del DOM, no en ocultar/mostrar por breakpoint.

Ejemplos (prohibido → permitido)
- Prohibido:
  - CSS: `@media (min-width: 1024px) { .card { width: 420px; } }`
  - Markup: `<div class="md:block lg:hidden">` (clases responsivas que cambian disposición)
- Permitido:
  - CSS: `.desktop-grid-x { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 1.5rem; }`
  - Markup: `<div class="desktop-grid-x">` (clase global que se adapta automáticamente)

Checklist de revisión (manual/automática)
- Buscar en el repo cadenas como `@media`, `md:`, `lg:`, `sm:`, `xl:` y validar que no condicionen cambios visuales.
- Verificar que no existan anchos fijos dentro de `@media` para componentes visuales clave (cards, grids, modals, headers).
- Confirmar que los templates renderizados por `app.js` usan las clases globales fluidas en lugar de utilidades responsivas.

Cómo usar este archivo
- Antes de proponer o aplicar cualquier cambio visual, el asistente debe leer este archivo y aplicar sus reglas.
- Si se necesita introducir un cambio dependiente de ancho por motivos funcionales, debe agregarse una nota abajo explicando la excepción y su justificación.

Agregar una excepción
- Para añadir una excepción, abrir este archivo y añadir una sección `## Excepciones` con:
  - motivo, archivos afectados, duración (si es temporal), y un plan para convertirlo a un enfoque fluido.

Contacto / responsabilidad
- Mantener este archivo actualizado es responsabilidad de quien realiza cambios visuales.

---

Este archivo debe ser leído y respetado por el asistente antes de modificar estilos o plantillas visuales en el proyecto.

**Regla adicional (único punto de control visual)**
- Todos los parámetros que modifiquen el aspecto visual del HTML deben poder modificarse en una sola sección del código (un único punto de control). Ese cambio debe verse reflejado tanto en dispositivos modernos como en dispositivos de fallback/antiguos.
- Implementación recomendada: definir un único valor en JS (por ejemplo `const CARD_GAP = '1rem'`), exponerlo a CSS mediante una variable (`--card-gap`) y proporcionar fallback para navegadores antiguos mediante `@supports not (gap: ...)`, una clase añadida por JS (`.no-flex-gap`) y/o aplicando `margin-bottom` inline cuando sea necesario. Cambiando ese único valor se debe actualizar la apariencia en todos los dispositivos.

