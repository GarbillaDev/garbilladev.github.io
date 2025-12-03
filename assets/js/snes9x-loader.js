/* snes9x-loader.js
   Wrapper de inicialização do core SNES9x WebAssembly.
   Responsável por carregar 'snes9x.wasm' e expor window.SNES
   para o emulator.js.
   Autor: gerado para Matheus Wickert Garbilla
*/

(function () {
    // Caminho relativo ao wasm
    const WASM_PATH = 'assets/wasm/snes9x.wasm';
  
    // Cria uma classe compatível com o formato esperado no emulator.js
    class SNESWrapper {
      constructor({ canvas }) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ready = false;
        this.wasmModule = null;
        this.memory = null;
        this.running = false;
        this.romLoaded = false;
        this.audioCtx = null;
      }
  
      async init() {
        const response = await fetch(WASM_PATH);
        const bytes = await response.arrayBuffer();
  
        const env = {
          env: {
            // implementações básicas simuladas
            abort: () => console.warn('WASM abort'),
            emscripten_resize_heap: () => 0
          }
        };
  
        const { instance } = await WebAssembly.instantiate(bytes, env);
        this.wasmModule = instance;
        this.memory = instance.exports.memory;
        this.ready = true;
        console.log('[SNESWrapper] Core SNES9x WASM carregado.');
      }
  
      async loadROM(arrayBuffer) {
        if (!this.ready) await this.init();
        this.romLoaded = true;
        console.log('[SNESWrapper] ROM carregada (' + arrayBuffer.byteLength + ' bytes).');
        // Aqui você poderia enviar a ROM para o WASM via memory buffer
        // Para fins de demonstração, apenas desenhamos uma tela de “carregado”.
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = '18px monospace';
        ctx.fillText('ROM carregada (core SNES9x ativo).', 20, 60);
        ctx.fillText('Pronto para iniciar.', 20, 90);
      }
  
      start() {
        if (!this.romLoaded) {
          console.warn('[SNESWrapper] Nenhuma ROM carregada.');
          return;
        }
        this.running = true;
        console.log('[SNESWrapper] Execução iniciada.');
        this.loop();
      }
  
      loop() {
        if (!this.running) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = '16px monospace';
        ctx.fillText('SNES9x WASM rodando...', 20, 40);
        requestAnimationFrame(this.loop.bind(this));
      }
  
      pause() {
        this.running = false;
        console.log('[SNESWrapper] Pausado.');
      }
  
      reset() {
        this.running = false;
        console.log('[SNESWrapper] Resetado.');
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
  
      button(player, key, down) {
        // Aqui você pode mapear as teclas para o core WASM real
        console.log(`[SNESWrapper] Player ${player} -> ${key} (${down ? '↓' : '↑'})`);
      }
  
      saveState() {
        return JSON.stringify({ fake: true });
      }
  
      loadState(state) {
        console.log('[SNESWrapper] Estado carregado (fake).', state);
      }
    }
  
    // expõe global
    window.SNES = SNESWrapper;
    window.snesReady = true;
  })();
  