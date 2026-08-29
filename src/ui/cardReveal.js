// Yankı Kartı gösterisi: keseden kart kazanınca ekran ortasında 3B dönerek
// belirir, kısa süre asılı kalır ve yukarı süzülerek kaybolur.

import { CARDS, RARITY } from '../data/cards.js';

const CSS = `
@keyframes card-reveal {
  0%   { transform: translate(-50%,-50%) perspective(600px) rotateY(0deg) scale(0.15); opacity: 0; }
  25%  { opacity: 1; }
  55%  { transform: translate(-50%,-50%) perspective(600px) rotateY(720deg) scale(1); opacity: 1; }
  75%  { transform: translate(-50%,-50%) perspective(600px) rotateY(720deg) scale(1); opacity: 1; }
  100% { transform: translate(-50%,-62%) perspective(600px) rotateY(720deg) scale(1.08); opacity: 0; }
}`;

export function createCardReveal() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  return {
    show(cardId) {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return;
      const rar = RARITY[card.rarity];

      const el = document.createElement('div');
      el.innerHTML =
        `<div style="font:bold 10px monospace;letter-spacing:2px;color:${rar.color};margin-bottom:6px">YANKI KARTI</div>` +
        `<div style="font:bold 16px Georgia,serif">${card.name}</div>` +
        `<div style="font:12px sans-serif;opacity:0.85;margin-top:6px;line-height:1.4">${card.desc}</div>`;
      Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        top: '38%',
        width: 'clamp(150px, 46vw, 190px)', // telefonda küçülmesin
        padding: '16px 12px',
        borderRadius: '10px',
        textAlign: 'center',
        color: '#efe6d5',
        background: 'linear-gradient(170deg, #2b2749, #171430)',
        border: `2px solid ${rar.color}`,
        boxShadow: `0 0 22px ${rar.color}88, 0 6px 20px #000c`,
        pointerEvents: 'none',
        zIndex: '28',
        animation: 'card-reveal 2.4s ease-in-out forwards',
      });
      el.addEventListener('animationend', () => el.remove());
      document.body.appendChild(el);
    },
  };
}
