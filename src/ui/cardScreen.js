// Kart şeridi (PLAN §6'nın revizyonu): seviye atlayınca teklif ekranın ÜST
// kısmında (maç saatinin altında) kompakt bir şerit olarak KENDİLİĞİNDEN belirir.
// Oyun KARARTILMAZ ve durmaz: yalnız kartların kendisi ve "sonra" düğmesi dokunuş
// alır, aradaki boşluklar oyuna geçirgendir — oyuncu hem oynar hem seçer.
// "Sonra" şeridi gizler ama teklif kaybolmaz; cardIndicator rozetine dokununca
// aynı teklif tekrar açılır. Görsel dil (nadirlik çerçeveleri, piksel ikonlar)
// eski tam ekran halinden küçültülerek korundu.

import { CARDS, RARITY } from '../data/cards.js';
import { ensureFrameCss, frameStyle, cornersHtml } from './rarityFrame.js';

const CSS = `
@keyframes card-in { from { transform: translateY(-10px) scale(0.92); opacity: 0; } to { transform: none; opacity: 1; } }
.cnd-strip { position: fixed; top: calc(30px + env(safe-area-inset-top, 0px)); left: 50%;
  transform: translateX(-50%); display: none; align-items: flex-start; gap: clamp(8px, 1vw, 14px);
  z-index: 24; pointer-events: none; user-select: none; -webkit-user-select: none; }
/* Dar ekranda minimap'la (sağ üst, ~122px yükseklik) çakışmasın: şerit onun altına iner.
   Kartlar büyüdüğü için eşik 700px → 840px'e çekildi. */
@media (max-width: 840px) { .cnd-strip { top: calc(128px + env(safe-area-inset-top, 0px)); } }
.cnd-card { position: relative; width: clamp(120px, 21vw, 260px); border-radius: 10px; padding: 3px;
  cursor: pointer; pointer-events: auto; animation: card-in 0.22s ease-out backwards; }
.cnd-card:active { transform: scale(0.96); }
/* Zemin gradyanı inline basılır (nadirliğe göre, RARITY.bg) — burada yalnız ortak kabuk */
.cnd-card-inner { border-radius: 8px; padding: clamp(7px, 0.8vw, 12px) clamp(7px, 0.8vw, 12px) clamp(9px, 1vw, 14px);
  text-align: center; color: #efe6d5;
  border: 1px solid rgba(255,255,255,0.09); }
.cnd-rar { font: bold clamp(9px, 1vw, 13px) monospace; letter-spacing: 2px; margin-bottom: 4px; }
.cnd-icon { width: clamp(40px, 4.5vw, 60px); height: clamp(40px, 4.5vw, 60px); margin: 2px auto;
  border-radius: 50%; display: flex;
  align-items: center; justify-content: center; overflow: hidden;
  background: radial-gradient(circle, rgba(255,255,255,0.10), rgba(0,0,0,0.35) 72%);
  border: 1px solid rgba(255,255,255,0.14); }
.cnd-icon img, .cnd-icon .crop { image-rendering: pixelated; }
.cnd-name { font: bold clamp(15px, 1.7vw, 22px) Georgia, serif; letter-spacing: 0.3px; margin-top: 4px; }
.cnd-desc { font: clamp(12px, 1.4vw, 18px) sans-serif; opacity: 0.85; line-height: 1.35;
  margin-top: 4px; min-height: 2.8em; overflow-wrap: break-word; }
.cnd-later { pointer-events: auto; align-self: center; width: clamp(32px, 3vw, 42px); height: clamp(32px, 3vw, 42px);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(24,22,48,0.85); border: 1px solid rgba(255,255,255,0.35); color: #cfd6e4;
  font: bold clamp(14px, 1.4vw, 18px) sans-serif; text-align: center; cursor: pointer; }
.cnd-later:active { transform: scale(0.92); }
`;

export function createCardScreen(onPick) {
  ensureFrameCss(); // nadirlik çerçevesi keyframe'leri (rarityFrame.js — üç kart UI'ı ortak)
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const strip = document.createElement('div');
  strip.className = 'cnd-strip';
  document.body.appendChild(strip);

  function hide() {
    strip.style.display = 'none';
  }

  function iconHtml(icon) {
    if (!icon) return '';
    if (typeof icon === 'string') {
      return `<img src="${icon}" style="max-width:28px;max-height:28px;transform:scale(2.8)" alt="">`;
    }
    // Emoji ikon: pack'te uygun sprite yoksa (çizme/kol). Boyut + hafif gölgeyle
    // pikselli sahneye oturtulur — ayrı asset gerekmez.
    if (icon.emoji) {
      return `<span style="font-size:clamp(26px, 2.8vw, 38px);line-height:1;filter:drop-shadow(0 1px 1px #000a)">${icon.emoji}</span>`;
    }
    // Sprite sheet'ten kare: background-position ile kırp
    return (
      `<div class="crop" style="width:${icon.w}px;height:${icon.h}px;transform:scale(1.8);` +
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
      // Çerçeve stili ortak yardımcıdan; destansının shimmer/glow listesinin başına
      // şeridin kendi giriş animasyonu eklenir (yardımcı giriş animasyonu bilmez)
      const fs = frameStyle(rar.key, rar.color);
      if (fs.animation) fs.animation = 'card-in 0.22s ease-out backwards, ' + fs.animation;
      Object.assign(el.style, fs);
      el.style.animationDelay = idx * 0.06 + 's';

      el.innerHTML =
        `<div class="cnd-card-inner" style="background:radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07), transparent 55%), ${rar.bg}">` +
        `<div class="cnd-rar" style="color:${rar.color}">◆ ${rar.name.toUpperCase()} ◆</div>` +
        `<div class="cnd-icon" style="box-shadow:inset 0 0 8px ${rar.color}44">${iconHtml(card.icon)}</div>` +
        `<div class="cnd-name">${card.name}</div>` +
        `<div class="cnd-desc">${card.desc}</div>` +
        `</div>` +
        cornersHtml(rar.color);

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

  return { show, hide, isOpen: () => strip.style.display !== 'none' };
}
