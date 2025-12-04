// game.js — versão robusta (corrige problema do botão iniciar)
(() => {
  'use strict';
  const debug = (...args) => console.log('[SimHack]', ...args);
  const warn = (...args) => console.warn('[SimHack]', ...args);
  const error = (...args) => console.error('[SimHack]', ...args);

  // --- seus dados QUIZ (copie exatamente do seu arquivo original) ---
  const QUIZ = [
    // ... (cole aqui o ARRAY QUIZ inteiro do seu arquivo original) ...
  ];

  // --- SFX (com resume seguro) ---
  class Sfx {
    constructor() {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.ctx = null; warn('AudioContext indisponível:', e && e.message); }
      this._resumed = false;
    }
    async resumeOnce() {
      if (!this.ctx || this._resumed) return;
      try { if (this.ctx.state === 'suspended') await this.ctx.resume(); this._resumed = true; debug('AudioContext resumido'); } catch (e) { warn('Falha ao resumir AudioContext', e); }
    }
    beep(freq = 440, time = 0.06, vol = 0.03, type = 'sine') {
      if (!this.ctx) return;
      try {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq; g.gain.value = vol;
        o.connect(g); g.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + time);
        o.stop(now + time + 0.02);
      } catch (e) {
        warn('Sfx.beep failed', e);
      }
    }
  }
  const S = new Sfx();

  // --- typewriter protegido ---
  let typing = { iv: null, running: false };
  function typeWriteTo(el, text, speed = 18) {
    return new Promise(resolve => {
      if (!el) { warn('typeWriteTo: elemento inválido'); resolve(); return; }
      if (typing.iv) { clearInterval(typing.iv); typing.running = false; }
      el.innerHTML = '';
      let i = 0;
      typing.running = true;
      typing.iv = setInterval(() => {
        if (!typing.running) { clearInterval(typing.iv); resolve(); return; }
        el.innerHTML += text.charAt(i) === ' ' ? '\u00A0' : text.charAt(i);
        el.scrollTop = el.scrollHeight;
        try { S.beep(120 + Math.random() * 300, 0.01, 0.008); } catch (_) {}
        i++;
        if (i >= text.length) { clearInterval(typing.iv); typing.running = false; resolve(); }
      }, speed);
    });
  }

  // --- checa DOM e retorna elementos ou null com mensagem útil ---
  function queryEls() {
    const ids = ['terminal-output','choices','game-start','game-next','game-reset','score','level','tool-card','history','unlocked-list','leaderboard'];
    const map = {};
    const missing = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      map[id] = el;
      if (!el) missing.push(id);
    });
    return { map, missing };
  }

  // --- lógica do jogo (semixo igual ao seu, mas com proteções) ---
  function initGameElements(els) {
    const out = els['terminal-output'];
    const choicesEl = els['choices'];
    const startBtn = els['game-start'];
    const nextBtn = els['game-next'];
    const resetBtn = els['game-reset'];
    const scoreEl = els['score'];
    const levelEl = els['level'];
    const toolCard = els['tool-card'];
    const historyEl = els['history'];
    const unlockedList = els['unlocked-list'];
    const leaderboardEl = els['leaderboard'];

    let levelIdx = 0, qIdx = 0, score = 0, running = false, answered = false;
    let unlocked = [];

    function updateHUD() {
      if (scoreEl) scoreEl.textContent = score;
      if (levelEl) levelEl.textContent = QUIZ[levelIdx] ? QUIZ[levelIdx].level : 0;
      if (unlockedList) unlockedList.innerHTML = unlocked.length ? unlocked.map(u => `<div>• ${u.title}</div>`).join('') : 'Nenhuma ainda';
      // render leaderboard if element exists
      if (leaderboardEl) {
        try {
          const arr = JSON.parse(localStorage.getItem('simhack.leaderboard') || '[]');
          leaderboardEl.innerHTML = arr.length ? arr.map((r,i)=>`<div>${i+1}. ${r.name} — ${r.score}</div>`).join('') : '<small>Nenhum</small>';
        } catch(e) { leaderboardEl.innerHTML = '<small>Erro ao carregar leaderboard</small>'; }
      }
    }

    function appendHistory(txt) {
      if (!historyEl) return;
      const node = document.createElement('div');
      node.textContent = txt;
      historyEl.prepend(node);
    }

    function showCard(card) {
      if (!toolCard) return;
      toolCard.innerHTML = `<strong>${card.title}</strong><p style="margin-top:8px;font-size:0.95rem;color:#d8fff0">${card.text}</p>`;
    }

    function renderChoices(q) {
      if (!choicesEl) return;
      choicesEl.innerHTML = '';
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.type = 'button';
        btn.textContent = opt;
        btn.addEventListener('click', () => onChoose(idx, q));
        choicesEl.appendChild(btn);
      });
    }

    async function loadQuestion() {
      answered = false;
      if (nextBtn) nextBtn.disabled = true;
      const quizLevel = QUIZ[levelIdx];
      if (!quizLevel) { finishQuiz(); return; }
      const q = quizLevel.questions[qIdx];
      if (!q) { warn('Pergunta indefinida — index', qIdx); finishQuiz(); return; }
      const header = `Nível ${quizLevel.level} — ${quizLevel.title} — Pergunta ${qIdx+1} / ${quizLevel.questions.length}\n\n`;
      await S.resumeOnce();
      await typeWriteTo(out, header + q.q, 14);
      renderChoices(q);
    }

    function onChoose(idx, q) {
      if (answered) return;
      answered = true;
      S.resumeOnce(); // garante resume no clique
      const correct = q.ans === idx;
      if (correct) {
        const gained = 250 + (QUIZ[levelIdx].level - 1) * 100;
        score += gained;
        unlocked.push(q.card);
        showCard(q.card);
        appendHistory(`+${gained} — ${q.card.title}`);
        S.beep(880, 0.08, 0.04, 'sine');
        typeWriteTo(out, `> Resposta correta ✓\n${q.card.title}: ${q.card.text}`).then(() => { if (nextBtn) nextBtn.disabled = false; updateHUD(); });
      } else {
        score = Math.max(0, score - 60);
        appendHistory(`-60 — erro em "${q.id}"`);
        S.beep(220, 0.18, 0.06, 'sawtooth');
        typeWriteTo(out, `> Resposta incorreta ✕\nResposta correta: ${q.options[q.ans]}`).then(() => { if (nextBtn) nextBtn.disabled = false; updateHUD(); });
      }
    }

    async function next() {
      qIdx++;
      const quizLevel = QUIZ[levelIdx];
      if (!quizLevel) { finishQuiz(); return; }
      if (qIdx >= quizLevel.questions.length) {
        await typeWriteTo(out, `\n--- Nível ${quizLevel.level} concluído. Pontuação parcial: ${score} ---\n`, 12);
        levelIdx++; qIdx = 0;
        if (levelIdx >= QUIZ.length) { finishQuiz(); return; }
        await typeWriteTo(out, `\nIniciando nível ${QUIZ[levelIdx].level} — ${QUIZ[levelIdx].title}...\n`, 12);
      }
      loadQuestion();
      updateHUD();
    }

    function finishQuiz() {
      running = false;
      if (choicesEl) choicesEl.innerHTML = '';
      typeWriteTo(out, `\n*** Quiz finalizado! Pontuação final: ${score} ***\n`, 10).then(() => {
        saveToLeaderboard(score);
        updateHUD();
        if (nextBtn) nextBtn.disabled = true;
      });
    }

    function saveToLeaderboard(pontos) {
      let name = 'ANON';
      try { name = prompt('Pontuação final: ' + pontos + '\nDigite seu nome para leaderboard (ou deixe em branco para ANON):') || 'ANON'; } catch(e){}
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem('simhack.leaderboard') || '[]'); } catch(e){ arr = []; }
      arr.unshift({score: pontos, name: String(name).substring(0,20)});
      arr = arr.sort((a,b) => b.score - a.score).slice(0,30);
      try { localStorage.setItem('simhack.leaderboard', JSON.stringify(arr)); } catch(e){ warn('localStorage set falhou', e); }
      window.dispatchEvent(new Event('reload-lb'));
    }

    // --- BINDINGS SEGUROS (garante que o evento é registrado uma vez) ---
    function safeAddListener(el, type, fn) {
      if (!el) { warn('Tentativa de bind em elemento inexistente:', type); return; }
      el.addEventListener(type, fn);
    }

    // Start button handler
    const startHandler = async () => {
      debug('Start clicado');
      levelIdx = 0; qIdx = 0; score = 0; unlocked = []; running = true; answered = false;
      if (historyEl) historyEl.innerHTML = '';
      if (toolCard) toolCard.innerHTML = 'Nenhuma ainda';
      if (nextBtn) nextBtn.disabled = true;
      await S.resumeOnce();
      updateHUD();
      await typeWriteTo(out, 'Iniciando SimHack — Quiz educativo...\n', 10);
      loadQuestion();
    };

    safeAddListener(startBtn, 'click', startHandler);
    safeAddListener(nextBtn, 'click', () => { if (running) next(); else warn('Clique em Iniciar antes de avançar.'); });
    safeAddListener(resetBtn, 'click', () => {
      running = false; levelIdx = 0; qIdx = 0; score = 0; unlocked = []; answered = false;
      updateHUD();
      if (out) out.innerHTML = 'Quiz reiniciado. Clique em Iniciar para começar.';
      if (choicesEl) choicesEl.innerHTML = '';
      if (toolCard) toolCard.innerHTML = 'Nenhuma ainda';
      if (historyEl) historyEl.innerHTML = '';
      if (nextBtn) nextBtn.disabled = true;
    });

    // reload leaderboard event
    window.addEventListener('reload-lb', updateHUD);

    updateHUD();

    debug('SimHack: event listeners registrados (start/next/reset). Se o botão iniciar ainda não responde, verifique o console para erros anteriores.');
  }

  // --- Inicialização: garante que a função rode após DOM carregado.
  function startInit() {
    const { map, missing } = queryEls();
    if (missing.length) {
      error('Inicialização abortada: faltam IDs no HTML:', missing);
      // apresenta aviso no DOM se possível
      const container = document.querySelector('.wrap') || document.body;
      const div = document.createElement('div');
      div.style.background = '#3f1b1b'; div.style.color = '#ffdede'; div.style.padding = '8px'; div.style.borderRadius = '6px'; div.style.marginBottom = '8px';
      div.textContent = 'SimHack: inicialização falhou — IDs faltando: ' + missing.join(', ') + '. Verifique o HTML.';
      container.prepend(div);
      return;
    }
    initGameElements(map);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    // já carregado
    startInit();
  }
})();
