// Kart şeridi (PLAN §6'nın revizyonu): seviye atlayınca teklif ekranın ÜST
// kısmında (maç saatinin altında) kompakt bir şerit olarak KENDİLİĞİNDEN belirir.
// Oyun KARARTILMAZ ve durmaz: yalnız kartların kendisi ve "sonra" düğmesi dokunuş
// alır, aradaki boşluklar oyuna geçirgendir — oyuncu hem oynar hem seçer.
// "Sonra" şeridi gizler ama teklif kaybolmaz; cardIndicator rozetine dokununca
// aynı teklif tekrar açılır. Görsel dil (nadirlik çerçeveleri, piksel ikonlar)
// eski tam ekran halinden küçültülerek korundu.

import { CARDS, RARITY } from '../data/cards.js';

const CSS = `
@keyframes card-in { from { transform: translateY(-10px) scale(0.92); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes epic-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
@keyframes epic-glow { 0%,100% { box-shadow: 0 0 10px #ffb54588, 0 3px 12px #000c; } 50% { box-shadow: 0 0 18px #ffb545cc, 0 3px 12px #000c; } }
.cnd-strip { position: fixed; top: calc(30px + env(safe-area-inset-top, 0px)); left: 50%;
  transform: translateX(-50%); display: none; align-items: flex-start; gap: 8px;
  z-index: 24; pointer-events: none; user-select: none; -webkit-user-select: none; }
/* Dar ekranda minimap'la (sağ üst, ~122px yükseklik) çakışmasın: şerit onun altına iner */
@media (max-width: 700px) { .cnd-strip { top: calc(128px + env(safe-area-inset-top, 0px)); } }
.cnd-card { position: relative; width: clamp(90px, 17vw, 140px); border-radius: 8px; padding: 2px;
  cursor: pointer; pointer-events: auto; animation: card-in 0.22s ease-out backwards; }
.cnd-card:active { transform: scale(0.96); }
.cnd-card-inner { border-radius: 6px; padding: 6px 6px 8px; text-align: center; color: #efe6d5;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07), transparent 55%),
    linear-gradient(170deg, #2b2749, #171430 60%, #12101f);
  border: 1px solid rgba(255,255,255,0.09); }
.cnd-rar { font: bold 8px monospace; letter-spacing: 2px; margin-bottom: 3px; }
.cnd-icon { width: 34px; height: 34px; margin: 2px auto; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; overflow: hidden;
  background: radial-gradient(circle, rgba(255,255,255,0.10), rgba(0,0,0,0.35) 72%);
  border: 1px solid rgba(255,255,255,0.14); }
.cnd-icon img, .cnd-icon .crop { image-rendering: pixelated; }
.cnd-name { font: bold 12px Georgia, serif; letter-spacing: 0.3px; margin-top: 3px; }
.cnd-desc { font: 10px sans-serif; opacity: 0.82; line-height: 1.3; margin-top: 3px; min-height: 26px; }
.cnd-corner { position: absolute; width: 6px; height: 6px; transform: rotate(45deg); border-radius: 1px; }
.cnd-later { pointer-events: auto; align-self: center; width: 30px; height: 30px; border-radius: 50%;
  background: rgba(24,22,48,0.85); border: 1px solid rgba(255,255,255,0.35); color: #cfd6e4;
  font: bold 13px/28px sans-serif; text-align: center; cursor: pointer; }
.cnd-later:active { transform: scale(0.92); }
`;

export function createCardScreen(onPick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const strip = document.createElement('div');
  strip.className = 'cnd-strip';
  document.body.appendChild(strip);

  function hide() {
    strip.style.display = 'none';
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
        boxShadow: `0 0 10px ${color}66, 0 3px 12px #000c`,
      };
    }
    return {
      background: `linear-gradient(165deg, #f2f5f7, ${color} 40%, #5c6670 85%)`,
      boxShadow: '0 3px 10px #000c',
    };
  }

  function iconHtml(icon) {
    if (!icon) return '';
    if (typeof icon === 'string') {
      return `<img src="${icon}" style="max-width:28px;max-height:28px;transform:scale(1.7)" alt="">`;
    }
    // Emoji ikon: pack'te uygun sprite yoksa (çizme/kol). Boyut + hafif gölgeyle
    // pikselli sahneye oturtulur — ayrı asset gerekmez.
    if (icon.emoji) {
      return `<span style="font-size:21px;line-height:1;filter:drop-shadow(0 1px 1px #000a)">${icon.emoji}</span>`;
    }
    // Sprite sheet'ten kare: background-position ile kırp
    return (
      `<div class="crop" style="width:${icon.w}px;height:${icon.h}px;transform:scale(1.1);` +
      `background:url('${icon.src}') -${icon.x}px -${icon.y}px no-repeat"></div>`
    );
  }

  function show(cardIds) {
    strip.innerHTML = '';
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
        `<div class="cnd-icon" style="box-shadow:inset 0 0 8px ${rar.color}44">${iconHtml(card.icon)}</div>` +
        `<div class="cnd-name">${card.name}</div>` +
        `<div class="cnd-desc">${card.desc}</div>` +
        `</div>` +
        corner(rar.color, 'top:-2px;left:-2px') +
        corner(rar.color, 'top:-2px;right:-2px') +
        corner(rar.color, 'bottom:-2px;left:-2px') +
        corner(rar.color, 'bottom:-2px;right:-2px');

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Şerit KAPANMAZ: bekleyen hak varsa sıradaki teklif aynı şeritte belirir,
        // son haktan sonra kapatmayı main (cards.picked) yönetir.
        onPick(idx);
      });
      strip.appendChild(el);
    });

    // "Sonra": şeridi gizler, teklif kaybolmaz — cardIndicator rozetinden geri açılır
    const later = document.createElement('div');
    later.className = 'cnd-later';
    later.textContent = '✕';
    later.title = 'Sonra';
    later.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hide();
    });
    strip.appendChild(later);

    strip.style.display = 'flex';
  }

  function corner(color, pos) {
    return `<div class="cnd-corner" style="${pos};background:${color};box-shadow:0 0 4px ${color}"></div>`;
  }

  return { show, hide, isOpen: () => strip.style.display !== 'none' };
}
