// Dinamik sanal joystick: ekranın sol yarısına ilk dokunuş joystick merkezini
// belirler, parmak sürüklenince eksen üretir. Görseli ui/joystick.js çizer.

const RADIUS = 56; // joystick yarıçapı (ekran px)
const DEAD = 0.15; // ölü bölge

export function createTouchInput(el) {
  const state = {
    active: false,
    pointerId: -1,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
    axisX: 0,
    axisY: 0,
  };

  function onDown(e) {
    if (state.active) return;
    if (e.clientX > window.innerWidth * 0.55) return; // sol yarı: hareket bölgesi
    state.active = true;
    state.pointerId = e.pointerId;
    state.originX = e.clientX;
    state.originY = e.clientY;
    state.knobX = e.clientX;
    state.knobY = e.clientY;
    updateAxis();
  }

  function onMove(e) {
    if (!state.active || e.pointerId !== state.pointerId) return;
    state.knobX = e.clientX;
    state.knobY = e.clientY;
    updateAxis();
  }

  function onUp(e) {
    if (e.pointerId !== state.pointerId) return;
    state.active = false;
    state.axisX = 0;
    state.axisY = 0;
  }

  function updateAxis() {
    let dx = (state.knobX - state.originX) / RADIUS;
    let dy = (state.knobY - state.originY) / RADIUS;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
      // Topuzu çembere sabitle
      state.knobX = state.originX + dx * RADIUS;
      state.knobY = state.originY + dy * RADIUS;
    }
    state.axisX = len < DEAD ? 0 : dx;
    state.axisY = len < DEAD ? 0 : dy;
  }

  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    state,
    radius: RADIUS,
    getAxis() {
      return { x: state.axisX, y: state.axisY, active: state.active };
    },
  };
}
