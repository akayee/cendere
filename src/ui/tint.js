// Tehlike tonu: GZ dışındayken ekrana hafif kızıl vinyet + sıcak ton biner.
// CSS geçişiyle yumuşak girer/çıkar; oynanışı örtmeyecek kadar hafiftir.

export function createDangerTint() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '15', // canvas üstü, UI altı
    opacity: '0',
    transition: 'opacity 0.7s ease',
    background: 'radial-gradient(ellipse at center, rgba(150,40,30,0.05) 55%, rgba(120,20,25,0.28) 100%)',
  });
  document.body.appendChild(el);

  let on = false;
  return {
    set(danger) {
      if (danger === on) return;
      on = danger;
      el.style.opacity = danger ? '1' : '0';
    },
  };
}
