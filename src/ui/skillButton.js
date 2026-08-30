// Mobil beceri butonu (sağ alt). Tek aktif beceri tasarımı — PLAN.md §5/§9.
// Boyut ekrana oranlı: küçük telefonda 64px taban, tablette 12vmin'e kadar büyür
// (Samsung tablet "buton çok küçük" düzeltmesi). Diğer butonlar aynı ölçek dilini kullanır.

// Ortak ölçek dili: beceri çapı — pot/context butonları konumlarını buna göre türetir
export const SKILL_SIZE = 'clamp(64px, 12vmin, 112px)';

export function createSkillButton(onPress) {
  const btn = document.createElement('div');
  btn.id = 'skill-btn';
  btn.textContent = '⚔';
  Object.assign(btn.style, {
    position: 'fixed',
    right: 'calc(24px + env(safe-area-inset-right, 0px))',
    bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
    width: SKILL_SIZE,
    height: SKILL_SIZE,
    borderRadius: '50%',
    background: 'rgba(20,22,40,0.55)',
    border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff',
    fontSize: 'clamp(28px, 5.5vmin, 52px)', // iç ikon çapla orantılı
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
