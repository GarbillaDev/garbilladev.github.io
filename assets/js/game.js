// assets/js/game.js
// Versão robusta — substitua totalmente seu game.js por este arquivo.
// Objetivo: eliminar erros por elementos faltantes, prevenir crashes e garantir que
// o botão "Iniciar" funcione mesmo em ambientes problemáticos.

(function () {
  'use strict';

  const tag = '[SimHack]';

  function log(...a){ console.log(tag, ...a); }
  function warn(...a){ console.warn(tag, ...a); }
  function err(...a){ console.error(tag, ...a); }

  // --- util para mostrar erro na página (banner) ---
  function showPageError(message){
    try {
      let box = document.getElementById('simhack-error-box');
      if(!box){
        box = document.createElement('div');
        box.id = 'simhack-error-box';
        box.style.position = 'fixed';
        box.style.left = '12px';
        box.style.right = '12px';
        box.style.top = '12px';
        box.style.zIndex = 99999;
        box.style.background = '#6b1313';
        box.style.color = '#ffecec';
        box.style.padding = '10px 14px';
        box.style.borderRadius = '6px';
        box.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)';
        box.style.fontFamily = 'system-ui,Arial,Helvetica,sans-serif';
        box.style.fontSize = '13px';
        document.body && document.body.appendChild(box);
      }
      box.textContent = 'SimHack (erro): ' + message;
    } catch (e){
      err('showPageError failed', e);
    }
  }

  // --- Safe AudioContext wrapper ---
  class SafeSfx {
    constructor(){
      this.ctx = null;
      this._resumed = false;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.ctx = null;
        warn('AudioContext não disponível:', e && e.message);
      }
    }
    async resumeOnce(){
      if(!this.ctx || this._resumed) return;
      try {
        if(this.ctx.state === 'suspended') await this.ctx.resume();
        this._resumed = true;
        log('AudioContext resumido');
      } catch(e){
        warn('Falha ao resumir AudioContext', e);
      }
    }
    beep(freq=440, time=0.06, vol=0.02, type='sine'){
      if(!this.ctx) return;
      try {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = vol;
        o.connect(g); g.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + time);
        o.stop(now + time + 0.02);
      } catch(e){ warn('Sfx beep falhou', e); }
    }
  }
  const S = new SafeSfx();

  // --- Typewriter com lock ---
  let typing = { iv: null, running: false };
  function typeWriteTo(el, text, speed = 18){
    return new Promise(resolve => {
      if(!el){ resolve(); return; }
      if(typing.iv) { clearInterval(typing.iv); typing.running = false; }
      el.innerHTML = '';
      let i = 0;
      typing.running = true;
      typing.iv = setInterval(() => {
        if(!typing.running){ clearInterval(typing.iv); resolve(); return; }
        el.innerHTML += text.charAt(i) === ' ' ? '\u00A0' : text.charAt(i);
        el.scrollTop = el.scrollHeight;
        try { S.beep(120 + Math.random()*200, 0.01, 0.01); } catch(_) {}
        i++;
        if(i >= text.length){ clearInterval(typing.iv); typing.running = false; resolve(); }
      }, speed);
    });
  }

  // --- Garantir que elementos existam: se faltarem, cria-se fallback no DOM ---
  function ensureId(id, tagName='div', opts={}) {
    let el = document.getElementById(id);
    if(!el) {
      el = document.createElement(tagName);
      el.id = id;
      if(opts.className) el.className = opts.className;
      if(opts.html) el.innerHTML = opts.html;
      // tenta inserir em um local lógico
      const place = document.querySelector('.game-wrapper') || document.querySelector('main') || document.body;
      if(place) place.appendChild(el);
      log(`Elemento criado automaticamente: #${id}`);
    }
    return el;
  }

  // --- Main init protected ---
  async function initGame(){
    try {
      // Se DOM ainda não pronto, espera
      if(document.readyState === 'loading'){
        await new Promise(res => document.addEventListener('DOMContentLoaded', res, {once:true}));
      }

      // garantir elementos
      const requiredIds = [
        'terminal-output','choices',
        'game-start','game-next','game-reset',
        'score','level','tool-card','history','unlocked-list','leaderboard'
      ];
      requiredIds.forEach(id => ensureId(id, 'div', {className:'simhack-auto'}));

      const out = document.getElementById('terminal-output');
      const choicesEl = document.getElementById('choices');
      const startBtn = document.getElementById('game-start');
      const nextBtn = document.getElementById('game-next');
      const resetBtn = document.getElementById('game-reset');
      const scoreEl = document.getElementById('score');
      const levelEl = document.getElementById('level');
      const toolCard = document.getElementById('tool-card');
      const historyEl = document.getElementById('history');
      const unlockedList = document.getElementById('unlocked-list');

      // debug info
      log('Elementos prontos, vinculando listeners...');

      // state
      let levelIdx = 0, qIdx = 0, score = 0, running = false, answered = false;
      let unlocked = [];

      // update hud safe
      function updateHUD(){
        try {
          if(scoreEl) scoreEl.textContent = score;
          if(levelEl) levelEl.textContent = (QUIZ[levelIdx] ? QUIZ[levelIdx].level : 0);
          if(unlockedList) unlockedList.innerHTML = unlocked.length ? unlocked.map(u => `<div>• ${u.title}</div>`).join('') : 'Nenhuma ainda';
        } catch(e){ warn('updateHUD falhou', e); }
      }

      function appendHistory(txt){
        try {
          const node = document.createElement('div');
          node.textContent = txt;
          historyEl.prepend(node);
        } catch(e){ warn('appendHistory falhou', e); }
      }

      function showCard(card){
        try {
          toolCard.innerHTML = `
            <strong>${card.title}</strong>
            <p style="margin-top:8px;font-size:0.95rem;color:#d8fff0">${card.text}</p>
          `;
        } catch(e){ warn('showCard falhou', e); }
      }

      function renderChoices(q){
        try {
          choicesEl.innerHTML = '';
          q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.type = 'button';
            btn.textContent = opt;
            btn.addEventListener('click', () => onChoose(idx, q));
            choicesEl.appendChild(btn);
          });
        } catch(e){ warn('renderChoices falhou', e); }
      }

      async function loadQuestion(){
        try {
          answered = false;
          if(nextBtn) nextBtn.disabled = true;
          const quizLevel = QUIZ[levelIdx];
          if(!quizLevel){ finishQuiz(); return; }
          const q = quizLevel.questions[qIdx];
          if(!q){ warn('Pergunta indefinida', qIdx); finishQuiz(); return; }
          const header = `Nível ${quizLevel.level} — ${quizLevel.title} — Pergunta ${qIdx+1} / ${quizLevel.questions.length}\n\n`;
          await S.resumeOnce();
          await typeWriteTo(out, header + q.q, 14);
          renderChoices(q);
        } catch(e){ err('loadQuestion erro', e); showPageError('Erro ao carregar pergunta. Veja console.'); }
      }

      function onChoose(idx, q){
        if(answered) return;
        answered = true;
        try {
          const correct = q.ans === idx;
          if(correct){
            const gained = 250 + (QUIZ[levelIdx].level - 1) * 100;
            score += gained;
            unlocked.push(q.card);
            showCard(q.card);
            appendHistory(`+${gained} — ${q.card.title}`);
            S.beep(880, 0.08, 0.04, 'sine');
            typeWriteTo(out, `> Resposta correta ✓\n${q.card.title}: ${q.card.text}`).then(() => { if(nextBtn) nextBtn.disabled = false; updateHUD(); });
          } else {
            score = Math.max(0, score - 60);
            appendHistory(`-60 — erro em "${q.id}"`);
            S.beep(220, 0.18, 0.06, 'sawtooth');
            typeWriteTo(out, `> Resposta incorreta ✕\nResposta correta: ${q.options[q.ans]}`).then(() => { if(nextBtn) nextBtn.disabled = false; updateHUD(); });
          }
        } catch(e){ warn('onChoose erro', e); }
      }

      async function next(){
        try {
          qIdx++;
          const quizLevel = QUIZ[levelIdx];
          if(!quizLevel){ finishQuiz(); return; }
          if(qIdx >= quizLevel.questions.length){
            await typeWriteTo(out, `\n--- Nível ${quizLevel.level} concluído. Pontuação parcial: ${score} ---\n`, 12);
            levelIdx++; qIdx = 0;
            if(levelIdx >= QUIZ.length){ finishQuiz(); return; }
            await typeWriteTo(out, `\nIniciando nível ${QUIZ[levelIdx].level} — ${QUIZ[levelIdx].title}...\n`, 12);
          }
          loadQuestion();
          updateHUD();
        } catch(e){ err('next erro', e); }
      }

      function finishQuiz(){
        try {
          running = false;
          choicesEl.innerHTML = '';
          typeWriteTo(out, `\n*** Quiz finalizado! Pontuação final: ${score} ***\n`, 10).then(() => {
            saveToLeaderboard(score);
            updateHUD();
            if(nextBtn) nextBtn.disabled = true;
          });
        } catch(e){ warn('finishQuiz erro', e); }
      }

      function saveToLeaderboard(pontos){
        try {
          const name = (prompt('Pontuação final: ' + pontos + '\nDigite seu nome para leaderboard (ou deixe em branco para ANON):') || 'ANON').substring(0,20);
          let arr = [];
          try { arr = JSON.parse(localStorage.getItem('simhack.leaderboard') || '[]'); } catch(e){ arr = []; }
          arr.unshift({ score: pontos, name });
          arr = arr.sort((a,b)=>b.score-a.score).slice(0,30);
          try { localStorage.setItem('simhack.leaderboard', JSON.stringify(arr)); } catch(e){ warn('localStorage set falhou', e); }
          window.dispatchEvent(new Event('reload-lb'));
        } catch(e){ warn('saveToLeaderboard erro', e); }
      }

      // safe bindings (avoid double-binding)
      function safeOn(el, ev, fn){
        if(!el) return;
        el.addEventListener(ev, fn);
      }

      // ensure startBtn clickable (resume audio and start)
      safeOn(startBtn, 'click', async () => {
        try {
          await S.resumeOnce();
          levelIdx = 0; qIdx = 0; score = 0; unlocked = []; running = true; answered = false;
          if(historyEl) historyEl.innerHTML = '';
          if(toolCard) toolCard.innerHTML = 'Nenhuma ainda';
          if(nextBtn) nextBtn.disabled = true;
          updateHUD();
          await typeWriteTo(out, 'Iniciando SimHack — Quiz educativo...\n', 10);
          await loadQuestion();
        } catch(e){ err('start handler erro', e); showPageError('Erro ao iniciar o jogo. Veja console.'); }
      });

      safeOn(nextBtn, 'click', () => { if(running) next(); });
      safeOn(resetBtn, 'click', () => {
        levelIdx = 0; qIdx = 0; score = 0; unlocked = []; running = false; answered = false;
        updateHUD();
        try { out.innerHTML = 'Quiz reiniciado. Clique em Iniciar para começar.'; } catch(_){}
        try { choicesEl.innerHTML = ''; } catch(_){}
        try { toolCard.innerHTML = 'Nenhuma ainda'; } catch(_){}
        try { historyEl.innerHTML = ''; } catch(_){}
        if(nextBtn) nextBtn.disabled = true;
      });

      // Leaderboard render on event
      window.addEventListener('reload-lb', () => {
        try {
          const el = document.getElementById('lb-list') || document.getElementById('leaderboard') || document.getElementById('leaderboard-list');
          if(!el) return;
          let arr = [];
          try { arr = JSON.parse(localStorage.getItem('simhack.leaderboard') || '[]'); } catch(e){ arr = []; }
          if(arr.length === 0) { if(el.tagName === 'OL') { el.innerHTML = '<li>— vazio —</li>'; } else el.innerHTML = '<div>— vazio —</div>'; return; }
          const html = arr.map((r,i)=>`<li>${i+1}. ${r.name} — ${r.score}</li>`).join('');
          if(el.tagName === 'OL') el.innerHTML = html; else el.innerHTML = `<ol>${html}</ol>`;
        } catch(e){ warn('reload-lb erro', e); }
      });

      // fire initial leaderboard render
      window.dispatchEvent(new Event('reload-lb'));
      updateHUD();

      log('SimHack inicializado com sucesso.');
    } catch (e){
      err('Erro crítico na inicialização do SimHack:', e);
      showPageError('Falha na inicialização do jogo. Veja console para detalhes.');
    }
  } // end initGame

  // Run init guarded
  try {
    initGame();
  } catch (e) {
    err('initGame top-level threw', e);
    showPageError('Erro ao executar o jogo. Veja console.');
  }

})(); // IIFE end
