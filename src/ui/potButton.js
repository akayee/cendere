// Pot butonu: sayaç rozeti ile. 3 slot (PLAN §9); boşken soluk.

export function createPotButton(onPress) {
  const btn = document.createElement('div');
  // Pakette yuvarlak şişe yok → kalp (kullanıcı tercihi)
  btn.innerHTML = '❤️<span id="pot-badge"></span>';
  Object.assign(btn.style, {
    position: 'fixed',
    right: 'calc(30px + env(safe-area-inset-right, 0px))',
    bottom: 'calc(108px + env(safe-area-inset-bottom, 0px))',
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    background: 'rgba(50,22,26,0.65)',
    border: '2px solid rgba(255,140,150,0.55)',
    font: '22px/44px sans-serif',
    textAlign: 'center',
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
