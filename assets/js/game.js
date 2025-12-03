// game.js — Quiz terminal avançado (SimHack)
// EDUCATIVO: perguntas + história + pontuação + níveis + leaderboard (localStorage)
// Contém efeitos de digitação e sons via WebAudio.

const QUIZ = [
    // Nível 1 — Ferramentas de rede / auditoria
    {
      level: 1,
      title: 'Ferramentas de Rede',
      questions: [
        {
          id: 'nmap',
          q: 'O que é o Nmap?',
          options: [
            'Scanner de redes: descoberta de hosts e serviços (alto-nível).',
            'Ferramenta para quebrar senhas automaticamente.',
            'Linguagem de programação para redes.'
          ],
          ans: 0,
          card: { title: 'Nmap', text: 'Nmap (Network Mapper) é amplamente usado para mapear redes, identificar hosts e serviços. Ferramenta útil para inventário e auditoria.' }
        },
        {
          id: 'wireshark',
          q: 'Qual o propósito principal do Wireshark?',
          options: [
            'Capturar e analisar pacotes de rede para diagnóstico e investigação.',
            'Gerenciar usuários do sistema operacional.',
            'Compilar programas em C.'
          ],
          ans: 0,
          card: { title: 'Wireshark', text: 'Wireshark é um analisador de protocolos de rede que permite visualizar tráfego e investigar problemas de rede.' }
        },
        {
          id: 'masscan',
          q: 'Qual é a função do Masscan (em alto-nível)?',
          options: [
            'Scanner de portas ultra-rápido para mapear grandes blocos de IP.',
            'Gerenciador de pacotes para Linux.',
            'Ferramenta de edição de imagens.'
          ],
          ans: 0,
          card: { title: 'Masscan', text: 'Masscan é projetado para escanear grandes redes rapidamente — usado para inventário em larga escala.' }
        }
      ]
    },

    // Nível 2 — Forense, Hash e Criptografia
    {
      level: 2,
      title: 'Forense & Criptografia',
      questions: [
        {
          id: 'forensics',
          q: 'Em alto nível, qual o objetivo da forense digital?',
          options: [
            'Coletar e analisar evidências digitais preservando a cadeia de custódia.',
            'Remover arquivos temporários do sistema.',
            'Instalar antivírus.'
          ],
          ans: 0,
          card: { title: 'Forensics', text: 'Forense digital: práticas para coletar, preservar e analisar evidências em incidentes de segurança.' }
        },
        {
          id: 'hash',
          q: 'Para que servem hashes como MD5 e SHA em segurança?',
          options: [
            'Verificar integridade de dados e identificar alterações.',
            'Aumentar a velocidade do processador.',
            'Gerar gráficos 3D.'
          ],
          ans: 0,
          card: { title: 'Hashes', text: 'Hashes geram um digest de dados; são usados para verificar integridade, assinaturas digitais e mais.' }
        }
      ]
    },

    // Nível 3 — Hardware & Arquitetura
    {
      level: 3,
      title: 'Hardware & Arquitetura',
      questions: [
        {
          id: 'cpu',
          q: 'O que é IPC (Instructions Per Cycle) em CPUs?',
          options: [
            'Métrica que indica quantas instruções um núcleo executa por ciclo de clock.',
            'Quantidade de memória cache.',
            'Uma interface gráfica para processadores.'
          ],
          ans: 0,
          card: { title: 'IPC', text: 'IPC é uma métrica de eficiência que, junto com a frequência, determina desempenho real do processador.' }
        },
        {
          id: 'gpu',
          q: 'Por que GPUs são importantes para games modernos?',
          options: [
            'Porque processam paralelamente gráficos complexos, shaders e física.',
            'Porque diminuem a latência de rede.',
            'Porque armazenam o sistema operacional.'
          ],
          ans: 0,
          card: { title: 'GPU', text: 'GPUs oferecem paralelismo massivo, acelerando renderização, ray tracing e cargas de ML em games.' }
        }
      ]
    },

    // Nível 4 — Games & Cultura técnica
    {
      level: 4,
      title: 'Games & Impacto',
      questions: [
        {
          id: 'gta6',
          q: 'Qual impacto técnico títulos AAA como GTA 6 têm na indústria?',
          options: [
            'Elevam requisitos gráficos e demandam GPUs potentes e engenharia de servidores.',
            'Diminuem a necessidade de processadores.',
            'Substituem jogos independentes completamente.'
          ],
          ans: 0,
          card: { title: 'GTA 6 (contexto)', text: 'Títulos AAA empurram limites gráficos, IA e infraestrutura, impulsionando desenvolvimento de hardware e otimizações.' }
        }
      ]
    }
];

// AUDIO
class Sfx {
  constructor() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { this.ctx = null; }
  }
  beep(freq = 440, time = 0.06, vol = 0.03, type = 'sine') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    o.start(now);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + time);
    o.stop(now + time + 0.02);
  }
}
const S = new Sfx();

// Efeito de digitação
function typeWriteTo(el, text, speed = 18) {
  return new Promise(resolve => {
    el.innerHTML = '';
    let i = 0;
    const iv = setInterval(() => {
      el.innerHTML += text.charAt(i).replace(/ /g, '\u00A0');
      el.scrollTop = el.scrollHeight;
      S.beep(120 + Math.random() * 400, 0.01, 0.01);
      i++;
      if (i >= text.length) {
        clearInterval(iv);
        resolve();
      }
    }, speed);
  });
}

// MAIN
document.addEventListener('DOMContentLoaded', () => {
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

  let levelIdx = 0, qIdx = 0, score = 0, running = false, answered = false;
  let unlocked = [];

  function updateHUD() {
    scoreEl.textContent = score;
    levelEl.textContent = QUIZ[levelIdx] ? QUIZ[levelIdx].level : 0;
    unlockedList.innerHTML = unlocked.length
      ? unlocked.map(u => `<div>• ${u.title}</div>`).join('')
      : 'Nenhuma ainda';
  }

  function appendHistory(txt) {
    const node = document.createElement('div');
    node.textContent = txt;
    historyEl.prepend(node);
  }

  function showCard(card) {
    toolCard.innerHTML =
      `<strong>${card.title}</strong><p style="margin-top:8px;font-size:0.95rem;color:#d8fff0">${card.text}</p>`;
  }

  function renderChoices(q) {
    choicesEl.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt;
      btn.dataset.idx = idx;
      btn.addEventListener('click', () => onChoose(idx, q));
      choicesEl.appendChild(btn);
    });
  }

  async function loadQuestion() {
    answered = false;
    nextBtn.disabled = true;

    const quizLevel = QUIZ[levelIdx];
    if (!quizLevel) { finishQuiz(); return; }

    const q = quizLevel.questions[qIdx];
    const header =
      `Nível ${quizLevel.level} — ${quizLevel.title} — Pergunta ${qIdx + 1} / ${quizLevel.questions.length}\n\n`;

    await typeWriteTo(out, header + q.q, 14);
    renderChoices(q);
  }

  function onChoose(idx, q) {
    if (answered) return;
    answered = true;

    const correct = q.ans === idx;

    if (correct) {
      const gained = 250 + (QUIZ[levelIdx].level - 1) * 100;
      score += gained;
      unlocked.push(q.card);
      showCard(q.card);
      appendHistory(`+${gained} — ${q.card.title}`);
      S.beep(880, 0.08, 0.04, 'sine');

      typeWriteTo(
        out,
        `> Resposta correta ✓\n${q.card.title}: ${q.card.text}`
      ).then(() => {
        nextBtn.disabled = false;
        updateHUD();
      });

    } else {
      score = Math.max(0, score - 60);
      appendHistory(`-60 — erro em "${q.id}"`);
      S.beep(220, 0.18, 0.06, 'sawtooth');

      typeWriteTo(
        out,
        `> Resposta incorreta ✕\nResposta correta: ${q.options[q.ans]}`
      ).then(() => {
        nextBtn.disabled = false;
        updateHUD();
      });
    }
  }

  async function next() {
    qIdx++;
    const quizLevel = QUIZ[levelIdx];

    if (!quizLevel) { finishQuiz(); return; }

    if (qIdx >= quizLevel.questions.length) {
      await typeWriteTo(
        out,
        `\n--- Nível ${quizLevel.level} concluído. Pontuação parcial: ${score} ---\n`,
        12
      );

      levelIdx++;
      qIdx = 0;

      if (levelIdx >= QUIZ.length) {
        finishQuiz();
        return;
      } else {
        await typeWriteTo(
          out,
          `\nIniciando nível ${QUIZ[levelIdx].level} — ${QUIZ[levelIdx].title}...\n`,
          12
        );
        loadQuestion();
      }

    } else {
      loadQuestion();
    }

    updateHUD();
  }

  function finishQuiz() {
    running = false;
    choicesEl.innerHTML = '';

    typeWriteTo(
      out,
      `\n*** Quiz finalizado! Pontuação final: ${score} ***\n`,
      10
    ).then(() => {
      saveToLeaderboard(score);
      updateHUD();
      nextBtn.disabled = true;
    });
  }

  function saveToLeaderboard(pontos) {
    const name = prompt(
      'Pontuação final: ' + pontos +
      '\nDigite seu nome para leaderboard (ou deixe em branco para ANON):'
    ) || 'ANON';

    let arr = [];

    try { arr = JSON.parse(localStorage.getItem('simhack.leaderboard')) || []; }
    catch (e) { arr = []; }

    arr.unshift({ score: pontos, name: name.substring(0, 20) });
    arr = arr.sort((a, b) => b.score - a.score).slice(0, 30);

    localStorage.setItem('simhack.leaderboard', JSON.stringify(arr));
    window.dispatchEvent(new Event('reload-lb'));
  }

  // buttons
  startBtn.addEventListener('click', () => {
    levelIdx = 0;
    qIdx = 0;
    score = 0;
    unlocked = [];
    historyEl.innerHTML = '';
    toolCard.innerHTML = 'Nenhuma ainda';

    running = true;
    updateHUD();

    typeWriteTo(out, 'Iniciando SimHack — Quiz educativo...\n', 10)
      .then(() => {
        loadQuestion();
      });
  });

  nextBtn.addEventListener('click', () => {
    if (running) next();
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    levelIdx = 0;
    qIdx = 0;
    score = 0;
    unlocked = [];

    updateHUD();

    out.innerHTML = 'Quiz reiniciado. Clique em Iniciar para começar.';
    choicesEl.innerHTML = '';
    toolCard.innerHTML = 'Nenhuma ainda';
    historyEl.innerHTML = '';

    nextBtn.disabled = true;
  });

  updateHUD();
});
