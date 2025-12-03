/* snes9x.js
   Loader simples — carrega snes9x-loader.js e inicializa o core global SNES.
   Autor: gerado para Matheus Wickert Garbilla
*/

(async function() {
    const script = document.createElement('script');
    script.src = 'assets/js/snes9x-loader.js';
    document.head.appendChild(script);
    script.onload = () => {
      console.log('[snes9x.js] Loader inicializado.');
      window.snes9xCoreInitialized = true;
    };
  })();
  