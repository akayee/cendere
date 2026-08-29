// Masaüstü test girdisi: WASD / ok tuşları → eksen.

export function createKeyboardInput() {
  const down = new Set();

  window.addEventListener('keydown', (e) => down.add(e.code));
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());

  let skillQueued = false;
  let cardsQueued = false;
  let gatherQueued = false;
  let potQueued = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) skillQueued = true;
    if (e.code === 'KeyE' && !e.repeat) cardsQueued = true;
    if (e.code === 'KeyF' && !e.repeat) gatherQueued = true;
    if (e.code === 'KeyQ' && !e.repeat) potQueued = true;
  });

  return {
    getAxis() {
      let x = 0;
      let y = 0;
      if (down.has('KeyA') || down.has('ArrowLeft')) x -= 1;
      if (down.has('KeyD') || down.has('ArrowRight')) x += 1;
      if (down.has('KeyW') || down.has('ArrowUp')) y -= 1;
      if (down.has('KeyS') || down.has('ArrowDown')) y += 1;
      return { x, y, active: x !== 0 || y !== 0 };
    },
    /** Bekleyen beceri isteğini tüketir */
    consumeSkill() {
      const s = skillQueued;
      skillQueued = false;
      return s;
    },
    /** Bekleyen kart ekranı isteğini tüketir (E tuşu) */
    consumeCards() {
      const c = cardsQueued;
      cardsQueued = false;
      return c;
    },
    /** Toplama/yoğunlaşma isteği (F) */
    consumeGather() {
      const g = gatherQueued;
      gatherQueued = false;
      return g;
    },
    /** Pot isteği (Q) */
    consumePot() {
      const p = potQueued;
      potQueued = false;
      return p;
    },
  };
}
