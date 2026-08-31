// Kart Kataloğu (lobi ekranından açılır): oyunda ÇIKABİLECEK TÜM kartların
// nadirliğe göre gruplu, kaydırılabilir tam ekran listesi. Salt bilgi ekranı —
// state değiştirmez, intent üretmez; CARDS'ı her açılışta RENDER ANINDA okur
// (veriye eklenen yeni kartlar kod değişmeden otomatik görünür).

import { CARDS, RARITY } from '../data/cards.js';
import { CLASSES } from '../data/classes.js';

const CSS = `
.cat-wrap { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column;
  background: rgba(10, 8, 20, 0.92); color: #efe6d5; user-select: none; -webkit-user-select: none; }
.cat-head { flex: none; display: flex; align-items: center; justify-content: center; position: relative;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px; }
.cat-title { font: bold 22px Georgia, serif; letter-spacing: 6px; color: #ffd75e;
  text-shadow: 0 0 18px #ffb54544; }
.cat-close { position: absolute; right: 12px; top: calc(10px + env(safe-area-inset-top, 0px));
  width: 34px; height: 34px; border-radius: 50%; background: rgba(24,22,48,0.85);
  border: 1px solid rgba(255,255,255,0.35); color: #cfd6e4; font: bold 15px/32px sans-serif;
  text-align: center; cursor: pointer; }
.cat-close:active { transform: scale(0.92); }
.cat-scroll { flex: 1; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch;
  padding: 4px 12px calc(20px + env(safe-area-inset-bottom, 0px)); }
.cat-body { max-width: 720px; margin: 0 auto; }
.cat-group { font: bold 12px monospace; letter-spacing: 3px; margin: 16px 2px 8px;
  padding-bottom: 4px; border-bottom: 1px solid; }
.cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
@media (min-width: 560px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 820px) { .cat-grid { grid-template-columns: repeat(4, 1fr); } }
/* Zemin gradyanı inline basılır (nadirliğe göre, RARITY.bg) — burada yalnız ortak kabuk */
.cat-card { border-radius: 8px; padding: 8px 8px 10px; text-align: center;
  border: 1px solid rgba(255,255,255,0.10); }
.cat-icon { width: 34px; height: 34px; margin: 2px auto 4px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; overflow: hidden;
  background: radial-gradient(circle, rgba(255,255,255,0.10), rgba(0,0,0,0.35) 72%);
  border: 1px solid rgba(255,255,255,0.14); }
.cat-icon img, .cat-icon .crop { image-rendering: pixelated; }
.cat-name { font: bold 12px Georgia, serif; letter-spacing: 0.3px; }
.cat-desc { font: 10px sans-serif; opacity: 0.8; line-height: 1.3; margin-top: 3px; }
.cat-class { display: inline-block; margin-top: 5px; padding: 1px 7px; border-radius: 8px;
  font: bold 9px sans-serif; letter-spacing: 0.5px; color: #8cd9ff;
  background: rgba(140,217,255,0.10); border: 1px solid rgba(140,217,255,0.35); }
`;

// cardScreen.js'teki iconHtml ile aynı yaklaşım (o dosya paralel çalışma alanı
// dışında kalsın diye burada yinelendi): string ikon = img, {emoji} = emoji ikonu
// (pack'te sprite'ı olmayan çizme/kol), diğer obje = sprite sheet'ten
// background-position kırpması, ikon yoksa boş daire kalır.
function iconHtml(icon) {
  if (!icon) return '';
  if (typeof icon === 'string') {
    return `<img src="${icon}" style="max-width:28px;max-height:28px;transform:scale(1.7)" alt="">`;
  }
  if (icon.emoji) {
    return `<span style="font-size:21px;line-height:1;filter:drop-shadow(0 1px 1px #000a)">${icon.emoji}</span>`;
  }
  return (
    `<div class="crop" style="width:${icon.w}px;height:${icon.h}px;transform:scale(1.1);` +
    `background:url('${icon.src}') -${icon.x}px -${icon.y}px no-repeat"></div>`
  );
}

function cardHtml(card, color) {
  // Sınıf rozeti yalnız classId taşıyan kartlarda; ad sözlükten (bilinmeyen id → ham id)
  const clsName = card.classId ? (CLASSES[card.classId]?.name ?? card.classId) : null;
  return (
    `<div class="cat-card" style="background:radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 55%), ${RARITY[card.rarity]?.bg ?? 'linear-gradient(170deg, #2b2749, #171430)'}">` +
    `<div class="cat-icon" style="box-shadow:inset 0 0 8px ${color}44">${iconHtml(card.icon)}</div>` +
    `<div class="cat-name" style="color:${color}">${card.name ?? card.id}</div>` +
    `<div class="cat-desc">${card.desc ?? ''}</div>` +
    (clsName ? `<div class="cat-class">${clsName}</div>` : '') +
    `</div>`
  );
}

/** Kataloğu tam ekran overlay olarak açar; ✕ veya kart dışına dokunuş kapatır. */
export function openCardCatalog() {
  // Stil bir kez eklenir (katalog tekrar tekrar açılabilir)
  if (!document.getElementById('cat-style')) {
    const style = document.createElement('style');
    style.id = 'cat-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const wrap = document.createElement('div');
  wrap.className = 'cat-wrap';

  // Gruplar RARITY tanım sırasında (Sıradan → Nadir → Destansı); kartlar render
  // anında nadirliğe göre süzülür. RARITY'de olmayan nadirlik değerleri sessizce
  // yutulmasın diye sona nötr bir grup olarak eklenir.
  let body = '';
  const seen = new Set();
  for (const rar of Object.values(RARITY)) {
    const group = CARDS.filter((c) => c.rarity === rar.key);
    if (group.length === 0) continue;
    group.forEach((c) => seen.add(c));
    body +=
      `<div class="cat-group" style="color:${rar.color};border-color:${rar.color}55">◆ ${rar.name.toUpperCase()}</div>` +
      `<div class="cat-grid">${group.map((c) => cardHtml(c, rar.color)).join('')}</div>`;
  }
  const rest = CARDS.filter((c) => !seen.has(c));
  if (rest.length > 0) {
    body +=
      `<div class="cat-group" style="color:#c9d1d9;border-color:#c9d1d955">◆ DİĞER</div>` +
      `<div class="cat-grid">${rest.map((c) => cardHtml(c, '#c9d1d9')).join('')}</div>`;
  }

  wrap.innerHTML =
    `<div class="cat-head"><div class="cat-title">KARTLAR</div><div class="cat-close">✕</div></div>` +
    `<div class="cat-scroll"><div class="cat-body">${body}</div></div>`;

  const close = () => wrap.remove();
  wrap.querySelector('.cat-close').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  // Lobi altta — dokunuşlar oraya sızmasın. armed: dış-tık kapatması ancak
  // overlay İÇİNDE başlayan bir dokunuştan sonra devreye girer; böylece kataloğu
  // AÇAN dokunuşun (lobi butonunda pointerdown ile açıldı) ardından gelen click
  // overlay'e düşse de kataloğu anında kapatmaz.
  let armed = false;
  wrap.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    armed = true;
  });
  // Kartçıkların DIŞINA (grup arası boşluk, zemin) DOKUNMAK kapatır. Bilerek
  // 'click' dinlenir: kaydırma sürüklemesi click üretmez → boşluktan başlayan
  // scroll katalog kapanmadan çalışır, yalnız gerçek "tık" kapatır.
  wrap.addEventListener('click', (e) => {
    if (!armed || !(e.target instanceof Element)) return;
    if (!e.target.closest('.cat-card') && !e.target.closest('.cat-close')) close();
  });

  document.body.appendChild(wrap);
}
