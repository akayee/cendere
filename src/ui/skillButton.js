// Mobil beceri butonu (sağ alt). Tek aktif beceri tasarımı — PLAN.md §5/§9.

export function createSkillButton(onPress) {
  const btn = document.createElement('div');
  btn.id = 'skill-btn';
  btn.textContent = '⚔';
  Object.assign(btn.style, {
    position: 'fixed',
    right: 'calc(24px + env(safe-area-inset-right, 0px))',
    bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(20,22,40,0.55)',
    border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff',
    font: '28px/60px sans-serif',
    textAlign: 'center',
    userSelect: 'none',
    webkitUserSelect: 'none',
    touchAction: 'none',
    zIndex: '20',
    overflow: 'hidden',
  });

  // Cooldown perdesi
  const veil = document.createElement('div');
  Object.assign(veil.style, {
    position: 'absolute',
    left: '0',
    bottom: '0',
    width: '100%',
    height: '0%',
    background: 'rgba(0,0,0,0.55)',
    pointerEvents: 'none',
  });
  btn.appendChild(veil);

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPress();
  });

  document.body.appendChild(btn);

  return {
    /** 0 = hazır, 1 = tam cooldown */
    setCooldown(frac) {
      veil.style.height = Math.round(frac * 100) + '%';
      btn.style.borderColor = frac <= 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)';
    },
  };
}
