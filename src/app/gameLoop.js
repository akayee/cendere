// Sabit adımlı sim (60 tps) + serbest fps render, interpolasyonlu
// (ARCHITECTURE.md §3). Kare süresi ne olursa olsun sim adımı sabittir.

import { SIM } from '../data/balance.js';

const MAX_FRAME = 0.25; // sekme arka plandan dönünce sim fırlamasın

export function startLoop({ update, render }) {
  let accumulator = 0;
  let lastTime = performance.now();

  function frame(now) {
    let frameDt = (now - lastTime) / 1000;
    lastTime = now;
    if (frameDt > MAX_FRAME) frameDt = MAX_FRAME;

    accumulator += frameDt;
    while (accumulator >= SIM.DT) {
      update();
      accumulator -= SIM.DT;
    }

    render(accumulator / SIM.DT, now / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
