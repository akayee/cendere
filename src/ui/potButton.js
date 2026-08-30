// Pot butonu: sayaç rozeti ile. 3 slot (PLAN §9); boşken soluk.
// Beceri butonunun ÜSTÜNDE, onunla aynı ölçek dilinde (ekrana oranlı) durur.

import { SKILL_SIZE } from './skillButton.js';

const SIZE = 'clamp(46px, 9vmin, 84px)';

export function createPotButton(onPress) {
  const btn = document.createElement('div');
  // Pakette yuvarlak şişe yok → kalp (kullanıcı tercihi)
  btn.innerHTML = '❤️<span id="pot-badge"></span>';
  Object.assign(btn.style, {
    position: 'fixed',
    // Beceri butonuyla aynı dikey eksende: sağ pay + çap farkının yarısı
    right: `calc(24px + env(safe-area-inset-right, 0px) + (${SKILL_SIZE} - ${SIZE}) / 2)`,
    // Beceri butonunun üstünde, parmak payı (16px) bırakarak
    bottom: `calc(28px + ${SKILL_SIZE} + 16px + env(safe-area-inset-bottom, 0px))`,
    width: SIZE,
    height: SIZE,
    borderRadius: '50%',
    background: 'rgba(50,22,26,0.65)',
    border: '2px solid rgba(255,140,150,0.55)',
    fontSize: 'clamp(22px, 4.3vmin, 40px)',
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    webkitUserSelect: 'none',
    touchAction: 'none',
    zIndex: '20',
  });

  const badge = btn.querySelector('#pot-badge');
  Object.assign(badge.style, {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: '#3a854e',
    color: '#fff',
    font: 'bold 11px/18px monospace',
    textAlign: 'center',
  });

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPress();
  });
  document.body.appendChild(btn);

  return {
    setCount(n) {
      badge.textContent = String(n);
      btn.style.opacity = n > 0 ? '1' : '0.35';
    },
  };
}
