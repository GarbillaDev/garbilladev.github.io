/* emulator.js — Full integration wrapper
   - Tenta carregar automaticamente um core SNES WASM (assets/js/snes9x.js -> assets/wasm/snes9x.wasm)
   - Se não houver core, faz fallback UI/demo (jsnes) para testar interface
   - Exibe a mensagem solicitada quando ROM é carregada e não há core:
       "Nenhum core disponível — carregue um core SNES (WASM) para executar ROMs."
   - Suporta: file input, drag&drop, keyboard, gamepad polling, save/load (if core supports), screenshot
   Author: gerado para Matheus Wickert Garbilla
*/

(async function () {
    // --------- Config ---------
    const SNES_JS_PATH = 'assets/js/snes9x.js'; // change if your core wrapper has another name
    const SNES_WASM_PATH = 'assets/wasm/snes9x.wasm'; // referenced by the wrapper usually
    const JSNES_CDN = 'https://unpkg.com/jsnes@0.8.0/dist/jsnes.min.js'; // fallback demo lib (NES)
    const CORE_LOAD_TIMEOUT = 12_000; // ms to wait for core to initialize
  
    // --------- DOM refs ---------
    const canvas = document.getElementById('emu-screen');
    const romFileInput = document.getElementById('rom-file');
    const runBtn = document.getElementById('emu-run');
    const pauseBtn = document.getElementById('emu-pause');
    const resetBtn = document.getElementById('emu-reset');
    const saveBtn = document.getElementById('emu-save');
    const loadBtn = document.getElementById('emu-load');
    const screenshotBtn = document.getElementById('emu-screenshot');
    const statusEl = document.getElementById('emu-status');
  
    if (!canvas) {
      console.warn('[EMU] canvas #emu-screen não encontrado. Saindo.');
      return;
    }
  
    // --------- State ---------
    let engine = null;            // instance of core (if loaded)
    let romName = null;
    let romBuffer = null;
    let coreAvailable = false;    // true if window.SNES (or set engine) is available
    let demoMode = false;         // fallback UI demo
    let gpIndex = null;
  
    // keyboard mapping (logical)
    const KEYMAP = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      KeyZ: 'A',
      KeyX: 'B',
      KeyA: 'X',
      KeyS: 'Y',
      KeyQ: 'L',
      KeyW: 'R',
      Enter: 'START',
      Space: 'SELECT'
    };
  
    // --------- Helpers ---------
    function status(txt) {
      if (statusEl) statusEl.textContent = txt;
      console.log('[EMU]', txt);
    }
  
    function loadScript(src, attrs = {}) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        Object.keys(attrs).forEach(k => s.setAttribute(k, attrs[k]));
        s.onload = () => resolve(s);
        s.onerror = (e) => reject(new Error('Erro ao carregar script: ' + src));
        document.head.appendChild(s);
      });
    }
  
    // try to load the SNES core wrapper (snes9x.js)
    async function loadSNESCoreWrapper() {
      // if core already present
      if (window.SNES || window.snes9xCoreInitialized) {
        coreAvailable = !!window.SNES;
        return coreAvailable;
      }
  
      try {
        // attempt to load snes9x wrapper script
        await loadScript(SNES_JS_PATH);
        // wrapper may start wasm loading asynchronously; wait for a ready signal
        const start = performance.now();
        while (performance.now() - start < CORE_LOAD_TIMEOUT) {
          // common patterns:
          // - wrapper exposes window.SNES (class)
          // - wrapper sets a "Module" or "snesReady" boolean
          if (window.SNES) {
            coreAvailable = true;
            return true;
          }
          // some wrappers expose a promise like window.snesReadyPromise
          if (window.snesReady || window.snesReadyPromise) {
            if (window.snesReady === true) { coreAvailable = !!window.SNES; return coreAvailable; }
            if (window.snesReadyPromise && typeof window.snesReadyPromise.then === 'function') {
              await window.snesReadyPromise;
              coreAvailable = !!window.SNES;
              return coreAvailable;
            }
          }
          // wait a little
          await new Promise(r => setTimeout(r, 120));
        }
        console.warn('[EMU] timeout ao esperar pelo wrapper SNES.');
        return false;
      } catch (err) {
        console.warn('[EMU] não foi possível carregar wrapper SNES:', err);
        return false;
      }
    }
  
    // fallback: load jsnes (NES) demo lib for interface testing
    async function loadJsnesFallback() {
      if (window.jsnes || window.NES) return true;
      try {
        await loadScript(JSNES_CDN);
        demoMode = true;
        status('Modo demo (jsnes) carregado — NÃO é SNES, apenas teste de UI.');
        return true;
      } catch (err) {
        console.warn('[EMU] falha ao carregar jsnes demo:', err);
        return false;
      }
    }
  
    // init core if available: instantiate engine object
    async function initCoreIfPossible() {
      // try wrapper
      const ok = await loadSNESCoreWrapper();
      if (ok && window.SNES) {
        try {
          // many wrappers expose a class SNES or function createSnes; adapt as best-effort
          // expected API (common): new SNES({ canvas: HTMLCanvasElement, audio: { sampleRate: 44100 } })
          engine = new window.SNES({ canvas: canvas });
          coreAvailable = true;
          demoMode = false;
          status('Core SNES WASM inicializado.');
          return true;
        } catch (err) {
          console.warn('[EMU] falha ao instanciar SNES core:', err);
          coreAvailable = false;
        }
      }
  
      // fallback to jsnes demo to keep UI usable
      const demoOk = await loadJsnesFallback();
      if (demoOk) {
        demoMode = true;
        coreAvailable = false;
        return true;
      }
  
      // nothing available
      coreAvailable = false;
      demoMode = false;
      return false;
    }
  
    // Use a demo behavior when no core: draw placeholder into canvas
    function drawDemoScreen(textLines=[]) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#cfc08a';
      ctx.font = '14px monospace';
      const pad = 20;
      textLines.forEach((ln, i) => ctx.fillText(ln, pad, pad + i*20));
    }
  
    // If a real core is present, call its loadROM API; otherwise show message then demo fallback
    async function handleROMFile(file) {
      romName = file.name;
      status('Lendo ROM: ' + romName + ' ...');
      const ab = await file.arrayBuffer();
      romBuffer = ab;
  
      // try to initialize core if not already
      if (!engine && !demoMode) {
        await initCoreIfPossible();
      }
  
      if (coreAvailable && engine) {
        try {
          // attempt common method names
          if (typeof engine.loadROM === 'function') {
            await engine.loadROM(ab);
            status('ROM carregada no core SNES: ' + romName);
          } else if (typeof engine.load === 'function') {
            await engine.load(ab);
            status('ROM carregada no core SNES (via load): ' + romName);
          } else {
            // if API unknown, inform user to adapt wrapper
            status('Core encontrado mas API desconhecida — adapte o wrapper (esperado: engine.loadROM(arrayBuffer)).');
          }
        } catch (err) {
          status('Erro carregando ROM no core SNES: ' + (err.message || err));
          console.error(err);
        }
        return;
      }
  
      // No core available -> show required-message (exact text requested)
      status('Nenhum core disponível — carregue um core SNES (WASM) para executar ROMs.');
      // Then provide demo feedback (so user sees something)
      const demoMsg = [
        '==== TF SNES (demo) ===',
        'Nenhum core SNES presente.',
        'Você carregou: ' + romName,
        '(Modo demo — a ROM não será executada como SNES.)'
      ];
      drawDemoScreen(demoMsg);
      // attempt demo behavior (if jsnes loaded)
      if (demoMode && window.jsnes) {
        // we won't attempt to actually run a SNES ROM on jsnes (NES core).
        status('Demo carregada — para executar SNES real adicione o core WASM.');
      }
    }
  
    // --------- UI bindings ---------
    if (romFileInput) {
      romFileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) handleROMFile(f);
      });
    }
  
    function setupDragAndDrop(el) {
      if (!el) return;
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList && el.classList.add('drop-hover'); });
      el.addEventListener('dragleave', (e) => { e.preventDefault(); el.classList && el.classList.remove('drop-hover'); });
      el.addEventListener('drop', (e) => {
        e.preventDefault(); el.classList && el.classList.remove('drop-hover');
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleROMFile(f);
      });
    }
    setupDragAndDrop(canvas);
  
    // Buttons
    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        if (!romBuffer) return status('Carregue uma ROM primeiro.');
        // if core not initialized, try init
        if (!engine && !demoMode) await initCoreIfPossible();
        if (coreAvailable && engine) {
          if (typeof engine.start === 'function') {
            engine.start();
            status('Emulação iniciada (core SNES).');
          } else {
            status('Core presente, mas método start() não encontrado — adapte o wrapper.');
          }
        } else {
          status('Nenhum core disponível — carregue um core SNES (WASM) para executar ROMs.');
        }
      });
    }
  
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (engine && typeof engine.pause === 'function') {
          engine.pause();
          status('Pausado.');
        } else {
          status('Pausar indisponível no core atual.');
        }
      });
    }
  
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (engine && typeof engine.reset === 'function') {
          engine.reset();
          status('Resetado.');
        } else {
          status('Reset indisponível no core atual.');
        }
      });
    }
  
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!romName) return status('Carregue ROM antes de salvar estado.');
        if (engine && typeof engine.saveState === 'function') {
          try {
            const state = engine.saveState();
            localStorage.setItem('emu.save.' + romName, JSON.stringify(state));
            status('Estado salvo em localStorage.');
          } catch (e) {
            status('Erro salvando estado: ' + e.message);
          }
        } else {
          status('Save-state não suportado pelo core atual.');
        }
      });
    }
  
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        if (!romName) return status('Carregue ROM antes de carregar estado.');
        const raw = localStorage.getItem('emu.save.' + romName);
        if (!raw) return status('Nenhum estado salvo encontrado para esta ROM.');
        if (engine && typeof engine.loadState === 'function') {
          try {
            const state = JSON.parse(raw);
            engine.loadState(state);
            status('Estado carregado.');
          } catch (e) {
            status('Erro carregando estado: ' + e.message);
          }
        } else {
          status('Load-state não suportado pelo core atual.');
        }
      });
    }
  
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        const data = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = data;
        a.download = (romName || 'snes_screenshot') + '.png';
        a.click();
      });
    }
  
    // Keyboard mapping
    function keyHandler(ev, down) {
      const btn = KEYMAP[ev.code];
      if (!btn) return;
      ev.preventDefault();
      if (engine && typeof engine.button === 'function') {
        engine.button(1, btn, down);
      } else {
        // visual feedback not implemented
      }
    }
    window.addEventListener('keydown', (e) => keyHandler(e, true));
    window.addEventListener('keyup', (e) => keyHandler(e, false));
  
    // Gamepad polling
    function pollGamepads() {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = (gpIndex !== null) ? gps[gpIndex] : gps[0];
      if (gp && engine && typeof engine.button === 'function') {
        gp.buttons.forEach((b, i) => {
          engine.button(1, 'GP' + i, !!b.pressed);
        });
      }
      requestAnimationFrame(pollGamepads);
    }
    window.addEventListener('gamepadconnected', (e) => {
      status('Gamepad conectado: ' + e.gamepad.id);
      gpIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      status('Gamepad desconectado.');
      gpIndex = null;
    });
    pollGamepads();
  
    // expose for debug
    window.__emu = {
      engine,
      initCoreIfPossible,
      handleROMFile,
      loadSNESCoreWrapper
    };
  
    // try to init core once at load (non-blocking)
    (async () => {
      const ok = await initCoreIfPossible();
      if (!ok) {
        status('Emulador pronto — nenhum core SNES WASM disponível. Interface pronta para ROMs (modo demo se possível).');
        // draw initial message
        drawDemoScreen([
          'Nenhum core disponível — carregue um core SNES (WASM) para executar ROMs.',
          'Arraste/solte uma ROM (.smc/.sfc) ou clique em "Carregar ROM".'
        ]);
      } else {
        status('Core SNES carregado — você pode carregar uma ROM.');
      }
    })();
  
  })(); 
  