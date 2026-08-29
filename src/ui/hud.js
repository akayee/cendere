// HUD: alt-orta durum paneli (can/XP/GZ/malzeme) + üst-orta maç saati.
// Panel dokunuşları yutmaz (pointer-events: none) — joystick/butonlar etkilenmez.

export function createHud() {
  const root = document.getElementById('hud');
  root.innerHTML = '';

  // --- Üst-orta: maç saati + evre
  const matchEl = document.createElement('div');
  Object.assign(matchEl.style, {
    position: 'fixed',
    top: 'calc(6px + env(safe-area-inset-top, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    font: 'bold 14px monospace',
    color: '#fff',
    textShadow: '0 1px 3px #000',
    pointerEvents: 'none',
    zIndex: '18',
    textAlign: 'center',
  });
  document.body.appendChild(matchEl);

  // --- Alt-orta: durum paneli
  const panel = document.createElement('div');
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div id="h-level" style="min-width:30px;height:30px;border-radius:50%;background:linear-gradient(160deg,#ffd75e,#c98a2e);
        color:#221a08;font:bold 15px/30px sans-serif;text-align:center;box-shadow:0 2px 6px #0008">1</div>
      <div style="flex:1">
        <div style="height:16px;background:rgba(0,0,0,0.55);border:1px solid #ffffff44;border-radius:8px;overflow:hidden;position:relative">
          <div id="h-hp" style="width:100%;height:100%;background:linear-gradient(180deg,#8af08a,#4cba4c);transition:width 0.15s"></div>
          <div id="h-hp-txt" style="position:absolute;inset:0;text-align:center;font:bold 10px/16px monospace;color:#fff;text-shadow:0 1px 2px #000"></div>
        </div>
        <div style="height:5px;background:rgba(0,0,0,0.55);border-radius:3px;margin-top:3px;overflow:hidden">
          <div id="h-xp" style="width:0%;height:100%;background:linear-gradient(180deg,#ffe9a0,#ffd75e)"></div>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;font:bold 12px monospace;color:#fff;text-shadow:0 1px 2px #000">
      <span id="h-zone" style="padding:1px 8px;border-radius:8px;font-size:11px"></span>
      <span id="h-mat"></span>
      <span style="display:flex;align-items:center;gap:4px;flex:1">
        <span style="font-size:10px;opacity:0.8">GZ</span>
        <span style="flex:1;height:5px;background:rgba(0,0,0,0.55);border-radius:3px;overflow:hidden;display:block">
          <span id="h-gz" style="display:block;width:100%;height:100%;background:#8cd9ff"></span>
        </span>
      </span>
    </div>`;
  Object.assign(panel.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
    transform: 'translateX(-50%)',
    // Telefonda sağdaki beceri/pot butonlarına TAŞMAZ: onlara ~190px pay bırak
    width: 'min(56vw, 270px)',
    maxWidth: 'calc(100vw - 195px)',
    padding: '8px 12px 9px',
    borderRadius: '12px',
    background: 'linear-gradient(170deg, rgba(24,22,48,0.72), rgba(12,10,26,0.72))',
    border: '1px solid rgba(255,255,255,0.14)',
    pointerEvents: 'none',
    zIndex: '18',
  });
  document.body.appendChild(panel);

  // --- Sol üst: kalan oyuncu rozeti (belirgin)
  const aliveEl = document.createElement('div');
  Object.assign(aliveEl.style, {
    position: 'fixed',
    top: 'calc(22px + env(safe-area-inset-top, 0px))',
    left: '8px',
    padding: '4px 10px',
    borderRadius: '10px',
    background: 'linear-gradient(170deg, rgba(24,22,48,0.8), rgba(12,10,26,0.8))',
    border: '1px solid rgba(140,217,255,0.4)',
    font: 'bold 14px monospace',
    color: '#8cd9ff',
    textShadow: '0 1px 2px #000',
    pointerEvents: 'none',
    zIndex: '18',
  });
  document.body.appendChild(aliveEl);

  // --- Sol üst: minik fps
  const fpsEl = document.createElement('div');
  Object.assign(fpsEl.style, {
    position: 'fixed',
    top: 'calc(6px + env(safe-area-inset-top, 0px))',
    left: '8px',
    font: '10px monospace',
    color: 'rgba(255,255,255,0.45)',
    pointerEvents: 'none',
    zIndex: '18',
  });
  document.body.appendChild(fpsEl);

  const $ = (id) => panel.querySelector('#' + id);
  const level = $('h-level');
  const hp = $('h-hp');
  const hpTxt = $('h-hp-txt');
  const xp = $('h-xp');
  const gz = $('h-gz');
  const zoneChip = $('h-zone');
  const matEl = $('h-mat');

  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  let frames = 0;
  let last = performance.now();

  return {
    frame(player, xpNext, wild, match, gzBudgetMax) {
      frames++;
      const now = performance.now();
      if (now - last < 250) return;
      const fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
      fpsEl.textContent = `v0.6 · ${fps} fps`;

      if (player) {
        level.textContent = player.progress.level;
        const frac = Math.max(0, player.health.hp / player.health.maxHp);
        hp.style.width = frac * 100 + '%';
        hp.style.background =
          frac > 0.35 ? 'linear-gradient(180deg,#8af08a,#4cba4c)' : 'linear-gradient(180deg,#f08a8a,#c94c4c)';
        hpTxt.textContent = `${Math.ceil(player.health.hp)} / ${player.health.maxHp}`;
        xp.style.width = Math.min(100, (player.progress.xp / xpNext) * 100) + '%';

        const z = player.zone;
        gz.style.width = (z.gzBudget / gzBudgetMax) * 100 + '%';
        gz.style.background = z.exiled ? '#e85a5a' : '#8cd9ff';

        if (z.exiled) {
          zoneChip.textContent = 'SÜRGÜN';
          zoneChip.style.background = '#7a1f1f';
          zoneChip.style.color = '#ffb0b0';
        } else if (wild) {
          zoneChip.textContent = 'VAHŞİ ×2';
          zoneChip.style.background = '#6b4d10';
          zoneChip.style.color = '#ffd75e';
        } else {
          zoneChip.textContent = 'GZ';
          zoneChip.style.background = '#1f4a26';
          zoneChip.style.color = '#8cf58c';
        }
        matEl.textContent = `🪵${player.gather.wood} ⛏${player.gather.ore}`;
      }
      if (match) {
        matchEl.innerHTML =
          `${fmt(match.t)} · <span style="color:#ffd75e">${match.phaseName ?? ''}</span>` +
          (match.nextIn != null ? ` <span style="opacity:0.7">(${fmt(match.nextIn)})</span>` : '');
        if (match.alive != null) aliveEl.textContent = `⚔ ${match.alive} OYUNCU`;
      }
    },
  };
}
