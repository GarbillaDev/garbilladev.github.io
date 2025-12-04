// game.js — Quiz terminal avançado (SimHack)

const QUIZ = [
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
                card: { title: 'Nmap', text: 'Nmap (Network Mapper) é amplamente usado para mapear redes, identificar hosts e serviços.' }
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
                card: { title: 'Wireshark', text: 'Wireshark permite investigar tráfego e diagnosticar anomalias de rede.' }
            },
            {
                id: 'masscan',
                q: 'Qual é a função do Masscan?',
                options: [
                    'Scanner de portas ultra-rápido para mapear grandes blocos de IP.',
                    'Gerenciador de pacotes para Linux.',
                    'Ferramenta de edição de imagens.'
                ],
                ans: 0,
                card: { title: 'Masscan', text: 'Masscan é usado para escanear grandes ranges de IP rapidamente.' }
            }
        ]
    },
    {
        level: 2,
        title: 'Forense & Criptografia',
        questions: [
            {
                id: 'forensics',
                q: 'Qual o objetivo da forense digital?',
                options: [
                    'Coletar e analisar evidências digitais preservando a cadeia de custódia.',
                    'Remover arquivos temporários.',
                    'Instalar antivírus.'
                ],
                ans: 0,
                card: { title: 'Forense', text: 'Forense digital envolve coleta e análise de evidências digitais.' }
            },
            {
                id: 'hash',
                q: 'Para que servem hashes em segurança?',
                options: [
                    'Verificar integridade de dados e identificar alterações.',
                    'Aumentar a velocidade do processador.',
                    'Gerar gráficos 3D.'
                ],
                ans: 0,
                card: { title: 'Hash', text: 'Hashes são usados para verificar integridade, autenticação e mais.' }
            }
        ]
    },
    {
        level: 3,
        title: 'Hardware & Arquitetura',
        questions: [
            {
                id: 'cpu',
                q: 'O que é IPC em CPUs?',
                options: [
                    'Instruções por ciclo executadas pelo núcleo.',
                    'Quantidade de memória cache.',
                    'Interface gráfica do processador.'
                ],
                ans: 0,
                card: { title: 'IPC', text: 'IPC indica quantas instruções um núcleo executa por ciclo.' }
            },
            {
                id: 'gpu',
                q: 'Por que GPUs são importantes para games modernos?',
                options: [
                    'Porque processam paralelamente gráficos complexos e shaders.',
                    'Porque diminuem a latência de rede.',
                    'Porque armazenam o sistema operacional.'
                ],
                ans: 0,
                card: { title: 'GPU', text: 'GPUs aceleram gráficos, ray tracing e cargas paralelas.' }
            }
        ]
    },
    {
        level: 4,
        title: 'Games & Impacto',
        questions: [
            {
                id: 'gta6',
                q: 'Qual impacto técnico títulos AAA como GTA 6 têm?',
                options: [
                    'Elevam requisitos gráficos e demandam GPUs potentes.',
                    'Diminuem necessidade de CPU.',
                    'Eliminam jogos indies.'
                ],
                ans: 0,
                card: { title: 'Impacto AAA', text: 'Jogos AAA impulsionam hardware, motores gráficos e infraestrutura.' }
            }
        ]
    }
];

// --- AUDIO SYSTEM (AUTO-FIX) ---
class Sfx {
    constructor() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.ctx = null;
        }
    }
    async resume() {
        if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    }
    beep(freq = 440, time = 0.06, vol = 0.03, type = "sine") {
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
        g.gain.exponentialRampToValueAtTime(0.0001, now + time);
        o.stop(now + time + 0.02);
    }
}
const S = new Sfx();

// --- TYPEWRITER FIX (ANTI BUG) ---
let typingLock = false;
function typeWriteTo(el, text, speed = 18) {
    return new Promise(resolve => {
        if (typingLock) typingLock = false;

        typingLock = true;
        el.innerHTML = "";
        let i = 0;

        const iv = setInterval(() => {
            if (!typingLock) { clearInterval(iv); return; }

            el.innerHTML += text[i] === " " ? "\u00A0" : text[i];
            el.scrollTop = el.scrollHeight;
            S.beep(120 + Math.random() * 300, 0.01, 0.008);
            i++;

            if (i >= text.length) {
                clearInterval(iv);
                typingLock = false;
                resolve();
            }
        }, speed);
    });
}

// --- MAIN ---
document.addEventListener("DOMContentLoaded", () => {
    const out = document.getElementById("terminal-output");
    const choicesEl = document.getElementById("choices");
    const startBtn = document.getElementById("game-start");
    const nextBtn = document.getElementById("game-next");
    const resetBtn = document.getElementById("game-reset");
    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const toolCard = document.getElementById("tool-card");
    const historyEl = document.getElementById("history");
    const unlockedList = document.getElementById("unlocked-list");

    let levelIdx = 0, qIdx = 0, score = 0, running = false, answered = false;
    let unlocked = [];

    function updateHUD() {
        scoreEl.textContent = score;
        levelEl.textContent = QUIZ[levelIdx] ? QUIZ[levelIdx].level : 0;
        unlockedList.innerHTML =
            unlocked.length
                ? unlocked.map(u => `<div>• ${u.title}</div>`).join("")
                : "Nenhuma ainda";
    }

    function appendHistory(t) {
        const div = document.createElement("div");
        div.textContent = t;
        historyEl.prepend(div);
    }

    function showCard(card) {
        toolCard.innerHTML =
            `<strong>${card.title}</strong><p style="margin-top:8px;">${card.text}</p>`;
    }

    function renderChoices(q) {
        choicesEl.innerHTML = "";
        q.options.forEach((op, i) => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.textContent = op;
            btn.addEventListener("click", () => onChoose(i, q));
            choicesEl.appendChild(btn);
        });
    }

    async function loadQuestion() {
        answered = false;
        nextBtn.disabled = true;

        const lvl = QUIZ[levelIdx];
        if (!lvl) return finishQuiz();

        const q = lvl.questions[qIdx];

        await typeWriteTo(
            out,
            `Nível ${lvl.level} — ${lvl.title}\nPergunta ${qIdx + 1}/${lvl.questions.length}\n\n${q.q}`,
            14
        );

        renderChoices(q);
    }

    function onChoose(idx, q) {
        if (answered) return;
        answered = true;

        S.resume();

        const correct = idx === q.ans;

        if (correct) {
            const pts = 250 + (QUIZ[levelIdx].level - 1) * 100;
            score += pts;
            unlocked.push(q.card);
            showCard(q.card);
            appendHistory(`+${pts} — ${q.card.title}`);
            S.beep(880, 0.09, 0.05);

            typeWriteTo(out, `> Correto ✓\n${q.card.title}: ${q.card.text}`).then(() => {
                nextBtn.disabled = false;
                updateHUD();
            });
        } else {
            score = Math.max(0, score - 60);
            appendHistory(`-60 — erro em ${q.id}`);
            S.beep(220, 0.2, 0.06, "sawtooth");

            typeWriteTo(out, `> Incorreto ✕\nResposta certa: ${q.options[q.ans]}`).then(() => {
                nextBtn.disabled = false;
                updateHUD();
            });
        }
    }

    async function next() {
        qIdx++;

        const lvl = QUIZ[levelIdx];
        if (!lvl) return finishQuiz();

        if (qIdx >= lvl.questions.length) {
            await typeWriteTo(out, `\n--- Nível ${lvl.level} concluído! Pontuação: ${score} ---\n`, 12);

            levelIdx++;
            qIdx = 0;

            if (levelIdx >= QUIZ.length) return finishQuiz();

            await typeWriteTo(out, `\nIniciando nível ${QUIZ[levelIdx].level} — ${QUIZ[levelIdx].title}...\n`, 12);
        }

        loadQuestion();
        updateHUD();
    }

    function finishQuiz() {
        running = false;
        nextBtn.disabled = true;
        choicesEl.innerHTML = "";

        typeWriteTo(out, `\n*** Quiz finalizado! Pontuação: ${score} ***\n`, 12).then(() => {
            saveToLeaderboard(score);
        });
    }

    function saveToLeaderboard(p) {
        const name = prompt(`Pontuação final: ${p}\nNome para leaderboard:`) || "ANON";

        let arr = JSON.parse(localStorage.getItem("simhack.lb") || "[]");
        arr.push({ name, score: p });
        arr = arr.sort((a, b) => b.score - a.score).slice(0, 30);

        localStorage.setItem("simhack.lb", JSON.stringify(arr));
        window.dispatchEvent(new Event("reload-lb"));
    }

    startBtn.addEventListener("click", async () => {
        running = true;
        levelIdx = 0;
        qIdx = 0;
        score = 0;
        unlocked = [];
        historyEl.innerHTML = "";
        toolCard.innerHTML = "Nenhuma ainda";
        nextBtn.disabled = true;

        S.resume();
        updateHUD();

        await typeWriteTo(out, "Iniciando SimHack...\n", 10);
        loadQuestion();
    });

    nextBtn.addEventListener("click", () => running && next());

    resetBtn.addEventListener("click", () => {
        running = false;
        levelIdx = 0;
        qIdx = 0;
        score = 0;
        unlocked = [];
        historyEl.innerHTML = "";
        toolCard.innerHTML = "Nenhuma ainda";
        out.innerHTML = "Quiz reiniciado.";
        choicesEl.innerHTML = "";
        nextBtn.disabled = true;
        updateHUD();
    });

    updateHUD();
});
