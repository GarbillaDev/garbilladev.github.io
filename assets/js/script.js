// script.js — Matrix background, UI helpers, leaderboard loader
document.addEventListener('DOMContentLoaded', () => {
    // MATRIX BACKGROUND
    const canvas = document.getElementById('matrix-bg');
    const ctx = canvas.getContext('2d');
  
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / 14);
      ypos.length = cols;
      for (let i = 0; i < cols; i++) if (!ypos[i]) ypos[i] = Math.floor(Math.random() * canvas.height / 14);
    }
    let cols = 0; let ypos = [];
    resize();
    window.addEventListener('resize', resize);
  
    function matrixTick() {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = '12px monospace';
      for (let i = 0; i < cols; i++) {
        const text = String.fromCharCode(33 + Math.random() * 94);
        ctx.fillText(text, i * 14, ypos[i] * 14);
        if (ypos[i] * 14 > canvas.height && Math.random() > 0.975) ypos[i] = 0;
        ypos[i]++;
      }
      requestAnimationFrame(matrixTick);
    }
    matrixTick();
  
    // Smooth scrolling for top nav
    document.querySelectorAll('.topnav a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  
    // Leaderboard loader & clear
    function loadLeaderboard(){
      const raw = localStorage.getItem('simhack.leaderboard');
      let arr = [];
      try { arr = JSON.parse(raw) || []; } catch(e){ arr = []; }
      const lbList = document.getElementById('lb-list');
      if (!lbList) return;
      lbList.innerHTML = arr.length ? arr.slice(0,10).map(item => `<li>${item.name} — ${item.score}</li>`).join('') : '<li>— vazio —</li>';
    }
    const clearBtn = document.getElementById('clear-lb');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      localStorage.removeItem('simhack.leaderboard');
      loadLeaderboard();
    });
  
    // reload on custom event
    window.addEventListener('reload-lb', loadLeaderboard);
    loadLeaderboard();
  
    // small contrast toggle (demo)
    const contrastBtn = document.getElementById('contrast-toggle');
    contrastBtn && contrastBtn.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
    });
  });
  