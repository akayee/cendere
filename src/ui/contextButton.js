// Bağlamsal buton (PLAN §9): kaynağa yakınken "topla", değilken (can eksikse)
// "yoğunlaş". Görünürlüğü/ikonu main her karede duruma göre günceller.

export function createContextButton(onPress) {
  const btn = document.createElement('div');
  Object.assign(btn.style, {
    position: 'fixed',
    right: 'calc(104px + env(safe-area-inset-right, 0px))',
    bottom: 'calc(34px + env(safe-area-inset-bottom, 0px))',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(30,40,24,0.6)',
    border: '2px solid rgba(220,255,190,0.55)',
    color: '#fff',
    font: '24px/48px sans-serif',
    textAlign: 'center',
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
    /** mode: '' (gizli) | 'wood' | 'ore' | 'herb' | 'focus' | 'cancel' */
    setMode(mode) {
      if (mode === current) return;
      current = mode;
      if (!mode) {
        btn.style.display = 'none';
        return;
      }
      const icons = { wood: '🪓', ore: '⛏', herb: '🌿', focus: '🧘', cancel: '✕' };
      btn.textContent = icons[mode] ?? '?';
      btn.style.display = 'block';
    },
  };
}
