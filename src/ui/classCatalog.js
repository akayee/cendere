// Karakter Kataloğu (lobiden "Karakterlerin tümünü gör" ile açılır): TÜM sınıfların
// dikey kaydırılabilir tam ekran listesi. Bir satıra dokunmak o sınıfı SEÇER
// (onPick çağrılır) ve katalog kapanır; ✕ veya satır dışına dokunuş seçmeden kapatır.
// CLASSES render anında okunur — yeni sınıf eklenince kod değişmeden görünür.
// (Desen: cardCatalog.js — tutarlılık için aynı overlay iskeleti kullanıldı.)

import { CLASSES } from '../data/classes.js';

const CSS = `
.chs-wrap { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column;
  background: rgba(10, 8, 20, 0.92); color: #efe6d5; user-select: none; -webkit-user-select: none; }
.chs-head { flex: none; display: flex; align-items: center; justify-content: center; position: relative;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px; }
.chs-title { font: bold 22px Georgia, serif; letter-spacing: 6px; color: #ffd75e;
  text-shadow: 0 0 18px #ffb54544; }
.chs-close { position: absolute; right: 12px; top: calc(10px + env(safe-area-inset-top, 0px));
  width: 34px; height: 34px; border-radius: 50%; background: rgba(24,22,48,0.85);
  border: 1px solid rgba(255,255,255,0.35); color: #cfd6e4; font: bold 15px/32px sans-serif;
  text-align: center; cursor: pointer; }
.chs-close:active { transform: scale(0.92); }
.chs-scroll { flex: 1; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch;
  padding: 4px 12px calc(20px + env(safe-area-inset-bottom, 0px)); }
.chs-body { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
.chs-hint { font: 12px sans-serif; opacity: 0.65; text-align: center; margin: 2px 0 4px; }
.chs-row { display: flex; gap: 14px; align-items: center; text-align: left; cursor: pointer;
  border-radius: 12px; padding: 12px 14px; border: 2px solid rgba(255,255,255,0.13);
  background: linear-gradient(170deg, #2b2749, #171430); transition: transform 0.12s; }
.chs-row:active { transform: scale(0.985); }
.chs-row.sel { border-color: #ffd75e; box-shadow: 0 0 18px #ffd75e44; }
.chs-img { flex: none; width: 64px; height: 64px; image-rendering: pixelated; }
.chs-info { flex: 1; min-width: 0; }
.chs-name { font: bold 20px Georgia, serif; }
.chs-name .tag { font: bold 10px sans-serif; letter-spacing: 1px; color: #221a08;
  background: #ffd75e; border-radius: 8px; padding: 2px 8px; vertical-align: 3px; margin-left: 8px; }
.chs-stats { font: bold 12px monospace; color: #8cd9ff; margin: 2px 0 4px; }
.chs-box { background: rgba(0,0,0,0.25); border-radius: 6px; padding: 6px 9px; margin-top: 6px; }
.chs-box.skill { background: rgba(255,215,94,0.08); border: 1px solid rgba(255,215,94,0.25); }
.chs-line { font: bold 13px sans-serif; color: #e8dcb8; }
.chs-box.skill .chs-line { color: #ffd75e; }
.chs-line .sub { opacity: 0.6; font-weight: normal; }
.chs-line img { height: 14px; vertical-align: -2px; image-rendering: pixelated; }
.chs-desc { font: 12px sans-serif; opacity: 0.8; line-height: 1.4; margin-top: 2px; }
.chs-perk { font: 12px monospace; color: #8cf58c; margin-top: 7px; }
`;

function rowHtml(cls, selectedId) {
  const f = cls.flavor;
  return (
    `<div class="chs-row${cls.id === selectedId ? ' sel' : ''}" data-class="${cls.id}">` +
    // Önizleme: lobi karoseliyle aynı mekanizma — Idle sheet'in ilk karesi, 4× büyütme
    `<div class="chs-img" style="background:url('pack/Actor/Characters/${cls.charFolder}/SeparateAnim/Idle.png') 0 0 no-repeat;background-size:256px 64px"></div>` +
    `<div class="chs-info">` +
    `<div class="chs-name">${cls.name}${cls.id === selectedId ? '<span class="tag">SEÇİLİ</span>' : ''}</div>` +
    // Stat seti karoselle birebir aynı sıra/simge dili (❤ CAN · ⚔ AD · 🛡 ARMOR · 👢 SPEED)
    `<div class="chs-stats">❤&nbsp;${cls.hp} · ⚔&nbsp;AD&nbsp;${cls.auto.damage} · 🛡&nbsp;ARMOR&nbsp;${cls.armor ?? 0} · 👢&nbsp;SPEED&nbsp;${cls.speed}</div>` +
    `<div class="chs-box"><div class="chs-line">⚔ ${f.autoName} <span class="sub">(otomatik)</span></div>` +
    `<div class="chs-desc">${f.autoDesc}</div></div>` +
    `<div class="chs-box skill"><div class="chs-line"><img src="${f.skillIcon}" alt=""> ${f.skillName} <span class="sub">(beceri)</span></div>` +
    `<div class="chs-desc">${f.skillDesc}</div></div>` +
    `<div class="chs-perk">⛏ ${f.perk}</div>` +
    `</div></div>`
  );
}

/**
 * Kataloğu tam ekran overlay olarak açar.
 * @param {string} selectedId — şu an seçili sınıf (satırı vurgulanır)
 * @param {(id: string) => void} onPick — bir sınıfa dokununca çağrılır; katalog kapanır
 */
export function openClassCatalog(selectedId, onPick) {
  // Stil bir kez eklenir (katalog tekrar tekrar açılabilir)
  if (!document.getElementById('chs-style')) {
    const style = document.createElement('style');
    style.id = 'chs-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const wrap = document.createElement('div');
  wrap.className = 'chs-wrap';
  wrap.innerHTML =
    `<div class="chs-head"><div class="chs-title">KARAKTERLER</div><div class="chs-close">✕</div></div>` +
    `<div class="chs-scroll"><div class="chs-body">` +
    `<div class="chs-hint">Bir karaktere dokun — seçilir ve lobiye dönersin</div>` +
    Object.values(CLASSES).map((cls) => rowHtml(cls, selectedId)).join('') +
    `</div></div>`;

  const close = () => wrap.remove();
  wrap.querySelector('.chs-close').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  // Lobi altta — dokunuşlar oraya sızmasın. armed: dış-tık kapatması ancak overlay
  // İÇİNDE başlayan bir dokunuştan sonra devreye girer (cardCatalog ile aynı gerekçe).
  let armed = false;
  wrap.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    armed = true;
  });
  // Satır seçimi ve dış-tık kapatma bilerek 'click' ile: kaydırma sürüklemesi click
  // üretmez → satır üstünden başlayan scroll yanlışlıkla seçim yapmaz.
  wrap.addEventListener('click', (e) => {
    if (!armed || !(e.target instanceof Element)) return;
    const row = e.target.closest('.chs-row');
    if (row) {
      onPick(row.getAttribute('data-class'));
      close();
    } else if (!e.target.closest('.chs-close')) {
      close();
    }
  });

  document.body.appendChild(wrap);
}
