# game/ — Mini-Game / Quiz

Este diretório contém documentação sobre o mini-game (SimHack).

## Arquivo principal
- O jogo/quiz está implementado em `assets/js/game.js` (const QUIZ ...).
- O quiz é terminal-style, com efeitos de digitação, sons e leaderboard salvo em `localStorage`.

## Como editar perguntas
- Editar diretamente no `QUIZ` em `assets/js/game.js`:
  - Adicione/remova níveis (cada nível tem `level`, `title` e `questions`).
  - Cada pergunta: `{ id, q, options: [], ans, card: { title, text } }`.
- Para separar dados (opcional): extraia `QUIZ` para `game/quiz.json` e modifique `game.js` para carregar JSON via fetch. (Se servir via `file://` o fetch falha; use servidor local.)

## Persistência
- Leaderboard e histórico são armazenados em `localStorage` sob a chave `simhack.leaderboard`.

## Ética
- Conteúdo do quiz fornece histórico e contexto — **não** possui instruções de ataque.
