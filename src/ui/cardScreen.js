// Kart seçim ekranı (PLAN §6). Oyunu DURDURMAZ — açıkken savunmasızsın;
// dışarı dokununca kapanır, teklif kaybolmaz (aynı 3 kart tekrar açılır).
// Görsel dil: koyu zemin + nadirlik renginde işlemeli çerçeve; ikonlar pakettin
// piksel sprite'ları (image-rendering: pixelated).

import { CARDS, RARITY } from '../data/cards.js';

const CSS = `
@keyframes card-in { from { transform: translateY(14px) scale(0.92); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes epic-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
@keyframes epic-glow { 0%,100% { box-shadow: 0 0 14px #ffb54588, 0 4px 18px #000c; } 50% { box-shadow: 0 0 26px #ffb545cc, 0 4px 18px #000c; } }
.cnd-card { position: relative; width: min(29vw, 165px); border-radius: 10px; padding: 3px; cursor: pointer;
  animation: card-in 0.22s ease-out backwards; }
.cnd-card:active { transform: scale(0.96); }
.cnd-card-inner { border-radius: 8px; padding: 12px 10px 14px; text-align: center; color: #efe6d5;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07), transparent 55%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0 2px, transparent 2px 4px),
    linear-gradient(170deg, #2b2749, #171430 60%, #12101f);
  border: 1px solid rgba(255,255,255,0.09); }
.cnd-rar { font: bold 10px monospace; letter-spacing: 3px; margin-bottom: 6px; }
.cnd-divider { height: 1px; margin: 7px 14px; }
.cnd-icon { width: 54px; height: 54px; margin: 4px auto 2px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center;
  background: radial-gradient(circle, rgba(255,255,255,0.10), rgba(0,0,0,0.35) 72%);
  border: 1px solid rgba(255,255,255,0.14); }
.cnd-icon img, .cnd-icon .crop { image-rendering: pixelated; }
.cnd-name { font: bold 15px Georgia, serif; letter-spacing: 0.4px; margin-top: 6px; }
.cnd-desc { font: 12px sans-serif; opacity: 0.82; line-height: 1.4; margin-top: 6px; min-height: 32px; }
.cnd-corner { position: absolute; width: 7px; height: 7px; transform: rotate(45deg); border-radius: 1px; }
`;

export function createCardScreen(onPick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'radial-gradient(circle at 50% 45%, rgba(30,24,64,0.55), rgba(8,6,20,0.78))',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    zIndex: '30',
    userSelect: 'none',
    webkitUserSelect: 'none',
  });

  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) hide(); // dışarı dokunma = kapat (teklif kalır)
  });

  document.body.appendChild(overlay);

  function hide() {
    overlay.style.display = 'none';
  }

  function frameStyle(rarKey, color) {
    if (rarKey === 'epic') {
      return {
        background: `linear-gradient(120deg, ${color}, #fff3c4, ${color}, #b06a12, ${color})`,
        backgroundSize: '300% 100%',
        animation: 'card-in 0.22s ease-out backwards, epic-shimmer 2.2s linear infinite, epic-glow 1.6s ease-in-out infinite',
      };
    }
    if (rarKey === 'rare') {
      return {
        background: `linear-gradient(165deg, #e6c8ff, ${color} 35%, #5b2e8a 80%)`,
        boxShadow: `0 0 14px ${color}66, 0 4px 18px #000c`,
      };
    }
    return {
      background: `linear-gradient(165deg, #f2f5f7, ${color} 40%, #5c6670 85%)`,
      boxShadow: '0 4px 16px #000c',
    };
  }

  function iconHtml(icon) {
    if (!icon) return '';
    if (typeof icon === 'string') {
      return `<img src="${icon}" style="max-width:44px;max-height:44px;transform:scale(2.4)" alt="">`;
    }
    // Sprite sheet'ten kare: background-position ile kırp
    const s = 1.6;
    return (
      `<div class="crop" style="width:${icon.w}px;height:${icon.h}px;transform:scale(${s});` +
      `background:url('${icon.src}') -${icon.x}px -${icon.y}px no-repeat"></div>`
    );
  }

  function show(cardIds) {
    overlay.innerHTML = '';
    cardIds.forEach((id, idx) => {
      const card = CARDS.find((c) => c.id === id);
      const rar = RARITY[card.rarity];
      const el = document.createElement('div');
      el.className = 'cnd-card';
      Object.assign(el.style, frameStyle(rar.key, rar.color));
      el.style.animationDelay = idx * 0.06 + 's';

      el.innerHTML =
        `<div class="cnd-card-inner">` +
        `<div class="cnd-rar" style="color:${rar.color}">◆ ${rar.name.toUpperCase()} ◆</div>` +
        `<div class="cnd-divider" style="background:linear-gradient(90deg,transparent,${rar.color},transparent)"></div>` +
        `<div class="cnd-icon" style="box-shadow:inset 0 0 10px ${rar.color}44">${iconHtml(card.icon)}</div>` +
        `<div class="cnd-name">${card.name}</div>` +
        `<div class="cnd-desc">${card.desc}</div>` +
        `<div class="cnd-divider" style="background:linear-gradient(90deg,transparent,${rar.color}88,transparent)"></div>` +
        `</div>` +
        corner(rar.color, 'top:-3px;left:-3px') +
        corner(rar.color, 'top:-3px;right:-3px') +
        corner(rar.color, 'bottom:-3px;left:-3px') +
        corner(rar.color, 'bottom:-3px;right:-3px');

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Ekran KAPANMAZ: bekleyen hak varsa sıradaki teklif aynı ekranda belirir,
        // son haktan sonra kapatmayı main (cards.picked) yönetir.
        onPick(idx);
      });
      overlay.appendChild(el);
    });
    overlay.style.display = 'flex';
  }

  function corner(color, pos) {
    return `<div class="cnd-corner" style="${pos};background:${color};box-shadow:0 0 5px ${color}"></div>`;
  }

  return { show, hide, isOpen: () => overlay.style.display !== 'none' };
}
