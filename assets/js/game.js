// assets/js/game.js
// Versão reforçada + correção total de layout avançando.
// O terminal agora é completamente isolado e NÃO empurra mais a página ao digitar.

(function () {
  'use strict';

  const tag = '[SimHack]';
  const log  = (...a)=>console.log(tag,...a);
  const warn = (...a)=>console.warn(tag,...a);
  const err  = (...a)=>console.error(tag,...a);

  /** -------------------------------------------------------
   * ERROR OVERLAY
   * ------------------------------------------------------- */
  function showPageError(msg){
    try{
      let box = document.getElementById('simhack-error-box');
      if(!box){
        box = document.createElement('div');
        box.id = 'simhack-error-box';
        Object.assign(box.style,{
          position:'fixed',left:'12px',right:'12px',top:'12px',zIndex:99999,
          background:'#6b1313',color:'#ffecec',padding:'10px 14px',
          borderRadius:'6px',boxShadow:'0 6px 20px rgba(0,0,0,.6)',
          fontFamily:'system-ui,Arial',fontSize:'13px'
        });
        document.body.appendChild(box);
      }
      box.textContent = 'SimHack (erro): ' + msg;
    }catch(e){ err('showPageError',e); }
  }

  /** -------------------------------------------------------
   * AUDIO SAFE
   * ------------------------------------------------------- */
  class SafeSfx{
    constructor(){
      try{
        this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      }catch(e){ this.ctx=null; warn('AudioContext indisponível'); }
      this._resumed = false;
    }
    async resumeOnce(){
      if(!this.ctx||this._resumed) return;
      if(this.ctx.state==='suspended') await this.ctx.resume();
      this._resumed=true;
    }
    beep(freq=440,time=.06,vol=.02,type='sine'){
      if(!this.ctx) return;
      try{
        const o=this.ctx.createOscillator();
        const g=this.ctx.createGain();
        o.type=type; o.frequency.value=freq; g.gain.value=vol;
        o.connect(g); g.connect(this.ctx.destination);
        const now=this.ctx.currentTime;
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now+time);
        o.stop(now+time+0.02);
      }catch(e){}
    }
  }
  const S = new SafeSfx();

  /** -------------------------------------------------------
   * TYPEWRITER — AGORA SEM SCROLL DA PÁGINA
   * ------------------------------------------------------- */
  let typing = { running:false, iv:null };

  function typeWriteTo(el,text,speed=18){
    return new Promise(resolve=>{
      if(!el){ resolve(); return; }

      if(typing.iv){ clearInterval(typing.iv); typing.running=false; }

      el.innerHTML="";
      let i=0;
      typing.running=true;

      typing.iv=setInterval(()=>{
        if(!typing.running){
          clearInterval(typing.iv);
          resolve();
          return;
        }

        el.innerHTML += text.charAt(i)===' ' ? '\u00A0' : text.charAt(i);

        // AGORA: rolagem local, sem mexer na página
        el.scrollTop = el.scrollHeight;

        try{ S.beep(120+Math.random()*200,0.01,0.01); }catch(_){}

        i++;
        if(i>=text.length){
          clearInterval(typing.iv);
          typing.running=false;
          resolve();
        }
      },speed);
    });
  }

  /** -------------------------------------------------------
   * GARANTE QUE ELEMENTOS EXISTAM
   * ------------------------------------------------------- */
  function ensureId(id,tag='div',opts={}){
    let el=document.getElementById(id);
    if(!el){
      el=document.createElement(tag);
      el.id=id;
      if(opts.className) el.className=opts.className;
      if(opts.html) el.innerHTML=opts.html;
      const place=document.querySelector('.game-wrapper')||document.body;
      place.appendChild(el);
    }
    return el;
  }

  /** -------------------------------------------------------
   * MAIN INIT
   * ------------------------------------------------------- */
  async function initGame(){
    try{
      if(document.readyState==='loading'){
        await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
      }

      // IDs obrigatórios
      const ids=[
        'terminal-output','choices',
        'game-start','game-next','game-reset',
        'score','level','tool-card','history','unlocked-list'
      ];
      ids.forEach(id=>ensureId(id));

      const out = document.getElementById('terminal-output');
      const choicesEl = document.getElementById('choices');
      const startBtn  = document.getElementById('game-start');
      const nextBtn   = document.getElementById('game-next');
      const resetBtn  = document.getElementById('game-reset');
      const scoreEl   = document.getElementById('score');
      const levelEl   = document.getElementById('level');
      const toolCard  = document.getElementById('tool-card');
      const historyEl = document.getElementById('history');
      const unlockedList = document.getElementById('unlocked-list');

      let levelIdx=0,qIdx=0,score=0,running=false,answered=false;
      let unlocked=[];

      function updateHUD(){
        scoreEl.textContent=score;
        levelEl.textContent=QUIZ[levelIdx]?QUIZ[levelIdx].level:0;
        unlockedList.innerHTML = unlocked.length
          ? unlocked.map(u=>`<div>• ${u.title}</div>`).join('')
          : 'Nenhuma ainda';
      }

      function appendHistory(t){
        const n=document.createElement('div');
        n.textContent=t;
        historyEl.prepend(n);
      }

      function showCard(c){
        toolCard.innerHTML = `
          <strong>${c.title}</strong>
          <p style="margin-top:8px;font-size:0.95rem;color:#d8fff0">${c.text}</p>`;
      }

      function renderChoices(q){
        choicesEl.innerHTML="";
        q.options.forEach((op,idx)=>{
          const b=document.createElement('button');
          b.textContent=op;
          b.type='button';
          b.className='choice-btn';
          b.addEventListener('click',()=>onChoose(idx,q));
          choicesEl.appendChild(b);
        });
      }

      async function loadQuestion(){
        answered=false;
        nextBtn.disabled=true;
        const lvl=QUIZ[levelIdx];
        if(!lvl){ finishQuiz(); return; }

        const q=lvl.questions[qIdx];
        if(!q){ finishQuiz(); return; }

        const header = `Nível ${lvl.level} — ${lvl.title}\nPergunta ${qIdx+1}/${lvl.questions.length}\n\n`;
        await S.resumeOnce();
        await typeWriteTo(out,header + q.q,14);
        renderChoices(q);
      }

      function onChoose(idx,q){
        if(answered) return;
        answered=true;

        const correct=(q.ans===idx);

        if(correct){
          const gained = 250 + (QUIZ[levelIdx].level-1)*100;
          score+=gained;
          unlocked.push(q.card);
          appendHistory(`+${gained} — ${q.card.title}`);
          showCard(q.card);
          S.beep(880,0.08,0.04);

          typeWriteTo(out,`> Correto ✓\n${q.card.title}: ${q.card.text}`)
            .then(()=>{nextBtn.disabled=false; updateHUD();});
        } else {
          score=Math.max(0,score-60);
          appendHistory(`-60 — erro em ${q.id}`);
          S.beep(220,0.18,0.06,'sawtooth');

          typeWriteTo(out,`> Errado ✕\nResposta correta: ${q.options[q.ans]}`)
            .then(()=>{nextBtn.disabled=false; updateHUD();});
        }
      }

      async function next(){
        qIdx++;
        const lvl=QUIZ[levelIdx];
        if(!lvl){ finishQuiz(); return; }

        if(qIdx>=lvl.questions.length){
          await typeWriteTo(out,`\n--- Nível ${lvl.level} concluído. ---\nPontuação: ${score}\n`,10);
          levelIdx++; qIdx=0;
          if(levelIdx>=QUIZ.length){ finishQuiz(); return; }
          await typeWriteTo(out,`\nCarregando nível ${QUIZ[levelIdx].level} — ${QUIZ[levelIdx].title}...\n`,10);
        }
        loadQuestion();
        updateHUD();
      }

      function finishQuiz(){
        running=false;
        choicesEl.innerHTML="";
        typeWriteTo(out,`\n*** FIM DO QUIZ — Pontuação Final: ${score} ***\n`,10);
      }

      // Eventos seguros
      startBtn.onclick = async ()=>{
        await S.resumeOnce();
        levelIdx=0;qIdx=0;score=0;running=true;answered=false;
        historyEl.innerHTML="";
        toolCard.innerHTML="Nenhuma ainda";
        nextBtn.disabled=true;
        updateHUD();
        await typeWriteTo(out,"Iniciando SimHack...\n",10);
        loadQuestion();
      };

      nextBtn.onclick = ()=>running && next();

      resetBtn.onclick = ()=>{
        levelIdx=0;qIdx=0;score=0;running=false;answered=false;
        out.innerHTML="Reiniciado. Clique em Iniciar.";
        historyEl.innerHTML="";
        choicesEl.innerHTML="";
        toolCard.innerHTML="Nenhuma ainda";
        nextBtn.disabled=true;
        updateHUD();
      };

      updateHUD();
      log("SimHack pronto.");
    }catch(e){
      err("Erro crítico:",e);
      showPageError("Falha ao iniciar o jogo. Veja console.");
    }
  }

  initGame();

})();
