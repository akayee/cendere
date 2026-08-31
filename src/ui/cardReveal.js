// Yankı Kartı gösterisi: yerden kart lootlanınca (elit kesesi / ganimet kesesi,
// gatherSystem "kese.opened") kart ekranın ÜST kısmında 3B dönerek belirir, kısa
// süre asılı kalır ve yukarı süzülerek kaybolur. Oyun durmaz.
// Art arda birden fazla kart kazanılırsa KUYRUK: biri bitmeden diğeri başlamaz,
// üst üste binme olmaz. Boyutlar viewport oranlı (clamp) — 2560×1600 tablette
// oyun sırasında okunabilir.

import { CARDS, RARITY } from '../data/cards.js';

const SHOW_T = 2.4; // saniye — animasyon süresi (kuyruk bunun bitişini bekler)

const CSS = `
@keyframes card-reveal {
  0%   { transform: translate(-50%,-50%) perspective(900px) rotateY(0deg) scale(0.15); opacity: 0; }
  25%  { opacity: 1; }
  55%  { transform: translate(-50%,-50%) perspective(900px) rotateY(720deg) scale(1); opacity: 1; }
  75%  { transform: translate(-50%,-50%) perspective(900px) rotateY(720deg) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-62%) perspective(900px) rotateY(720deg) scale(1.08); opacity: 0; }
}`;

export function createCardReveal() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  /** @type {string[]} bekleyen kart id'leri */
  const queue = [];
  let showing = false;

  function next() {
    const cardId = queue.shift();
    if (cardId === undefined) {
      showing = false;
      return;
    }
    showing = true;
    const card = CARDS.find((c) => c.id === cardId);
    if (!card) {
      next(); // tanınmayan id kuyruğu tıkamasın
      return;
    }
    const rar = RARITY[card.rarity];

    const el = document.createElement('div');
    el.innerHTML =
      `<div style="font:bold clamp(11px, 1.1vw, 15px) monospace;letter-spacing:3px;color:${rar.color};margin-bottom:8px">YANKI KARTI</div>` +
      `<div style="font:bold clamp(20px, 2.4vw, 32px) Georgia,serif;letter-spacing:0.5px">${card.name}</div>` +
      `<div style="font:clamp(15px, 1.7vw, 22px) sans-serif;opacity:0.88;margin-top:8px;line-height:1.45">${card.desc}</div>`;
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      top: 'calc(30% + env(safe-area-inset-top, 0px))', // ekranın üst kısmı (kart şeridinin altı)
      width: 'clamp(210px, 32vw, 400px)', // telefonda küçülmesin, tablette büyüsün
      padding: 'clamp(16px, 1.6vw, 24px) clamp(14px, 1.4vw, 20px)',
      borderRadius: '12px',
      textAlign: 'center',
      color: '#efe6d5',
      background: 'linear-gradient(170deg, #2b2749, #171430)',
      border: `2px solid ${rar.color}`,
      boxShadow: `0 0 28px ${rar.color}88, 0 8px 26px #000c`,
      pointerEvents: 'none',
      zIndex: '28',
      animation: `card-reveal ${SHOW_T}s ease-in-out forwards`,
    });
    // animationend bazen (sekme arka plana düşünce) gelmeyebilir — zamanlayıcı sigortası
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.remove();
      next();
    };
    el.addEventListener('animationend', finish);
    setTimeout(finish, SHOW_T * 1000 + 200);
    document.body.appendChild(el);
  }

  return {
    show(cardId) {
      queue.push(cardId);
      if (!showing) next();
    },
  };
}
