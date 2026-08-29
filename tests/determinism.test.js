import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng.js';
import { createWorld } from '../src/sim/world.js';
import { createPlayer } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';

describe('determinizm (ARCHITECTURE.md §0)', () => {
  it('aynı seed aynı diziyi üretir', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('aynı seed + aynı girdiler = aynı dünya durumu', () => {
    const run = () => {
      const world = createWorld(1234);
      const p = createPlayer(world, 'cengaver', world.map.widthPx / 2, world.map.heightPx / 2);
      for (let i = 0; i < 300; i++) {
        p.input.moveX = Math.sin(i / 10) > 0 ? 1 : -1;
        p.input.moveY = 0.5;
        step(world);
      }
      return { x: p.transform.x, y: p.transform.y, statics: world.map.statics.length };
    };
    expect(run()).toEqual(run());
  });

  it('harita üretimi deterministik', () => {
    const w1 = createWorld(777);
    const w2 = createWorld(777);
    expect(w1.map.statics.length).toBe(w2.map.statics.length);
    expect(w1.map.lakes).toEqual(w2.map.lakes);
  });
});
