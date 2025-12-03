# mini_game_readme.md — Guia do Mini-Game (SimHack Quiz)

Objetivo
--------
Quiz educativo que ensina história e conceitos sobre ferramentas e hardware por meio de perguntas organizadas em níveis.

Como funciona
-------------
- O quiz reside em `assets/js/game.js` (const QUIZ = [...]).
- Cada nível tem `level`, `title` e `questions`.
- Ao responder corretamente, o jogador ganha pontos e desbloqueia uma "ficha" (card) com histórico/contexto.
- As pontuações são salvas no `localStorage` em `simhack.leaderboard` para o leaderboard.

Editar/Adicionar Perguntas
--------------------------
1. Abra `assets/js/game.js`.
2. Edite/adicione objetos dentro do array `QUIZ`.
3. Cada pergunta tem a forma:
   ```js
   {
     id: 'nmap',
     q: 'Texto da pergunta?',
     options: ['op1','op2','op3'],
     ans: 0, // índice da opção correta
     card: { title: 'Nmap', text: 'Descrição / história da ferramenta.' }
   }
