// Ses aç/kapa düğmesi (sol üst, fps'in yanı). Tercih localStorage'da kalıcı.

export function createMuteButton(sfx) {
  const btn = document.createElement('div');
  Object.assign(btn.style, {
    position: 'fixed',
    top: 'calc(52px + env(safe-area-inset-top, 0px))',
    left: '8px',
    // Diğer butonlarla aynı ölçek dili: ekrana oranlı (tablet düzeltmesi)
    width: 'clamp(34px, 6vmin, 56px)',
    height: 'clamp(34px, 6vmin, 56px)',
    borderRadius: '50%',
    background: 'rgba(24,22,48,0.75)',
    border: '1px solid rgba(255,255,255,0.25)',
    fontSize: 'clamp(16px, 2.8vmin, 26px)',
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    webkitUserSelect: 'none',
    touchAction: 'none',
    zIndex: '20',
    cursor: 'pointer',
  });
  const refresh = () => {
    btn.textContent = sfx.muted ? '🔇' : '🔊';
    btn.style.opacity = sfx.muted ? '0.5' : '1';
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sfx.toggleMute();
    refresh();
  });
  refresh();
  document.body.appendChild(btn);
}
