// Lobi (sınıf seçimi) ve maç sonu ekranları (PLAN §2 maç akışı).

import { CLASSES } from '../data/classes.js';
import { openCardCatalog } from './cardCatalog.js';

const WRAP_STYLE = {
  position: 'fixed',
  inset: '0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 40%, #2b2749, #12101f 75%)',
  color: '#efe6d5',
  zIndex: '50',
  userSelect: 'none',
  webkitUserSelect: 'none',
  textAlign: 'center',
};

/** Lobi: sınıf seç → başlat. Şimdilik yalnız Cengâver açık (diğerleri M6). */
export function showLobby(onStart) {
  const el = document.createElement('div');
  Object.assign(el.style, WRAP_STYLE);
  el.innerHTML =
    `<div style="font:bold 44px Georgia,serif;letter-spacing:8px;color:#ffd75e;text-shadow:0 0 24px #ffb54566">CENDERE</div>` +
    `<div style="font:13px sans-serif;opacity:0.7;margin:6px 0 26px">Son kalan kazanır. Cendere daralıyor.</div>` +
    `<div id="lobby-classes" style="display:flex;gap:14px"></div>` +
    `<div id="lobby-start" style="margin-top:30px;padding:12px 46px;border-radius:8px;background:linear-gradient(160deg,#ffd75e,#c98a2e);color:#221a08;font:bold 17px sans-serif;cursor:pointer;box-shadow:0 4px 16px #0009">MAÇA BAŞLA</div>` +
    // İkincil buton: altın dilinin soluk/çerçeveli hali — kart kataloğunu açar
    `<div id="lobby-cards" style="margin-top:12px;padding:9px 34px;border-radius:8px;background:rgba(255,215,94,0.08);border:1px solid rgba(255,215,94,0.45);color:#ffd75e;font:bold 13px sans-serif;letter-spacing:1px;cursor:pointer">KARTLAR</div>`;

  const classes = el.querySelector('#lobby-classes');
  let selected = 'cengaver';
  const cards = [];

  for (const cls of Object.values(CLASSES)) {
    const f = cls.flavor;
    // Karakter önizlemesi: Idle sheet'in ilk (aşağı bakan) karesi, 4× büyütme
    const charImg =
      `<div style="width:64px;height:64px;margin:2px auto 4px;image-rendering:pixelated;` +
      `background:url('pack/Actor/Characters/${cls.charFolder}/SeparateAnim/Idle.png') 0 0 no-repeat;` +
      `background-size:256px 64px"></div>`;

    const card = document.createElement('div');
    card.innerHTML =
      charImg +
      `<div style="font:bold 16px Georgia,serif">${cls.name}</div>` +
      `<div style="font:bold 10px monospace;color:#8cd9ff;margin:4px 0 8px">❤ ${cls.hp} · 👢 SPEED ${cls.speed}</div>` +
      `<div style="text-align:left;background:rgba(0,0,0,0.25);border-radius:6px;padding:6px 8px;margin-bottom:6px">` +
      `<div style="font:bold 11px sans-serif;color:#e8dcb8">⚔ ${f.autoName} <span style="opacity:0.6;font-weight:normal">(otomatik)</span></div>` +
      `<div style="font:10px sans-serif;opacity:0.75;line-height:1.35;margin-top:2px">${f.autoDesc}</div>` +
      `</div>` +
      `<div style="text-align:left;background:rgba(255,215,94,0.08);border:1px solid rgba(255,215,94,0.25);border-radius:6px;padding:6px 8px">` +
      `<div style="font:bold 11px sans-serif;color:#ffd75e">` +
      `<img src="${f.skillIcon}" style="height:13px;vertical-align:-2px;image-rendering:pixelated" alt=""> ${f.skillName} <span style="opacity:0.6;font-weight:normal">(beceri)</span></div>` +
      `<div style="font:10px sans-serif;opacity:0.8;line-height:1.35;margin-top:2px">${f.skillDesc}</div>` +
      `</div>` +
      `<div style="font:10px monospace;color:#8cf58c;margin-top:7px">⛏ ${f.perk}</div>`;
    Object.assign(card.style, {
      width: 'min(30vw, 185px)',
      padding: '12px 10px 12px',
      borderRadius: '12px',
      background: 'linear-gradient(170deg,#2b2749,#171430)',
      cursor: 'pointer',
      transition: 'transform 0.12s',
    });
    card.addEventListener('pointerdown', () => {
      selected = cls.id;
      refresh();
    });
    cards.push({ card, id: cls.id });
    classes.appendChild(card);
  }
  function refresh() {
    for (const { card, id } of cards) {
      const on = id === selected;
      card.style.border = on ? '2px solid #ffd75e' : '1px solid #ffffff22';
      card.style.opacity = on ? '1' : '0.55';
      card.style.transform = on ? 'scale(1.04)' : 'scale(1)';
      card.style.boxShadow = on ? '0 0 18px #ffd75e44' : 'none';
    }
  }
  refresh();

  el.querySelector('#lobby-start').addEventListener('pointerdown', () => {
    el.remove();
    onStart(selected);
  });
  // Kart kataloğu: lobinin üstünde tam ekran overlay (oyun henüz başlamadı)
  el.querySelector('#lobby-cards').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    openCardCatalog();
  });
  document.body.appendChild(el);
}

/** Maç sonu: ölüm ya da hayatta kalma. */
export function showEndScreen({ win, level, timeText }, onRestart) {
  const el = document.createElement('div');
  Object.assign(el.style, { ...WRAP_STYLE, background: win ? WRAP_STYLE.background : 'radial-gradient(circle at 50% 40%, #3d1420, #12060b 75%)' });
  el.innerHTML =
    `<div style="font:bold 38px Georgia,serif;letter-spacing:4px;color:${win ? '#ffd75e' : '#e85a5a'}">${win ? 'HAYATTA KALDIN' : 'CENDERE SENİ ALDI'}</div>` +
    `<div style="font:14px sans-serif;opacity:0.8;margin:14px 0 4px">Seviye ${level} · Süre ${timeText}</div>` +
    `<div id="end-restart" style="margin-top:26px;padding:12px 42px;border-radius:8px;background:linear-gradient(160deg,#ffd75e,#c98a2e);color:#221a08;font:bold 16px sans-serif;cursor:pointer">TEKRAR OYNA</div>`;
  el.querySelector('#end-restart').addEventListener('pointerdown', onRestart);
  document.body.appendChild(el);
}
