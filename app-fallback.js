/* app-fallback.js
   Detecta soporte real de `gap` en contenedores flex y, si falta soporte,
   añade la clase `no-flex-gap` al elemento <html> para que CSS pueda aplicar
   un fallback consistente en navegadores antiguos (p. ej. Safari iOS).
*/
(function detectFlexGapSupport(){
    function _check(){
        try{
            const flex = document.createElement('div');
            flex.style.display = 'flex';
            flex.style.flexDirection = 'column';
            // use rowGap so the effect is vertical spacing between children
            flex.style.rowGap = '1px';
            flex.style.position = 'absolute';
            flex.style.top = '-9999px';
            flex.appendChild(document.createElement('div'));
            flex.appendChild(document.createElement('div'));
            document.documentElement.appendChild(flex);
            // If gap is supported the scrollHeight should equal the gap (1px)
            const isSupported = flex.scrollHeight === 1;
            document.documentElement.removeChild(flex);
            if (!isSupported) document.documentElement.classList.add('no-flex-gap');
        }catch(e){
            // conservador: marcar como no soportado si algo falla
            try{ document.documentElement.classList.add('no-flex-gap'); }catch(_){/* ignore */}
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _check); else _check();
})();

/* Export nothing; this script only augments the <html> with .no-flex-gap when needed. */
