// Bağlamsal buton (PLAN §9): can eksikken "yoğunlaş", kanal açıkken "iptal".
// (Toplama temasla anında olduğundan gather modu kalktı.)
// Görünürlüğü/ikonu main her karede duruma göre günceller.
// Beceri butonunun SOLUNDA, aynı ölçek dilinde (ekrana oranlı) durur.

import { SKILL_SIZE } from './skillButton.js';

const SIZE = 'clamp(52px, 10vmin, 96px)';

export function createContextButton(onPress) {
  const btn = document.createElement('div');
  Object.assign(btn.style, {
    position: 'fixed',
    // Beceri butonunun solunda, parmak payı (16px) bırakarak
    right: `calc(24px + ${SKILL_SIZE} + 16px + env(safe-area-inset-right, 0px))`,
    bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
    width: SIZE,
    height: SIZE,
    borderRadius: '50%',
    background: 'rgba(30,40,24,0.6)',
    border: '2px solid rgba(220,255,190,0.55)',
    color: '#fff',
    fontSize: 'clamp(24px, 4.6vmin, 44px)',
    fontFamily: 'sans-serif',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    webkitUserSelect: 'none',
    touchAction: 'none',
    zIndex: '20',
    display: 'none',
  });

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPress();
  });
  document.body.appendChild(btn);

  let current = '';
  return {
    /** mode: '' (gizli) | 'focus' | 'cancel' */
    setMode(mode) {
      if (mode === current) return;
      current = mode;
      if (!mode) {
        btn.style.display = 'none';
        return;
      }
      const icons = { focus: '🧘', cancel: '✕' };
      btn.textContent = icons[mode] ?? '?';
      btn.style.display = 'flex';
    },
  };
}
