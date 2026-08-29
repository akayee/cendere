import { describe, it, expect } from 'vitest';
import { createSpatialHash } from '../src/core/spatialHash.js';
import { movementSystem } from '../src/sim/systems/movementSystem.js';
import { physicsSystem } from '../src/sim/systems/physicsSystem.js';

function makeWorld(statics) {
  const staticHash = createSpatialHash(32);
  for (const b of statics) {
    if (b.shape === 'circle') staticHash.insert(b, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r);
    else staticHash.insert(b, b.minX, b.minY, b.maxX, b.maxY);
  }
  return { staticHash, movers: [], map: { widthPx: 1000, heightPx: 1000 } };
}

function makeMover(x, y) {
  return {
    transform: { x, y, prevX: x, prevY: y, dir: 'down' },
    motion: { velX: 0, velY: 0, speed: 95 },
    body: { radius: 5, solid: true },
    input: { moveX: 0, moveY: 0 },
    render: { animState: 'idle' },
  };
}

describe('physicsSystem', () => {
  it('AABB (göl) sağa yürüyen oyuncuyu kenarında durdurur', () => {
    const water = { shape: 'aabb', type: 'water', minX: 300, minY: 100, maxX: 400, maxY: 300 };
    const world = makeWorld([water]);
    const p = makeMover(250, 200);
    world.movers.push(p);

    p.input.moveX = 1;
    for (let i = 0; i < 600; i++) {
      movementSystem(world);
      physicsSystem(world);
    }
    // 10 sn sağa yürüdü: gölün sol kenarını (300) geçmemiş olmalı
    expect(p.transform.x).toBeLessThanOrEqual(300 - 5 + 0.001);
    expect(p.transform.x).toBeGreaterThan(280); // kenara kadar gelebildi
  });

  it('daire (ağaç gövdesi) üzerinden geçilemez', () => {
    const tree = { shape: 'circle', type: 'tree', x: 300, y: 200, r: 5 };
    const world = makeWorld([tree]);
    const p = makeMover(250, 200);
    world.movers.push(p);

    p.input.moveX = 1;
    for (let i = 0; i < 600; i++) {
      movementSystem(world);
      physicsSystem(world);
    }
    // Tam karşıdan gelen oyuncu gövdenin içine giremez
    const d = Math.hypot(p.transform.x - 300, p.transform.y - 200);
    expect(d).toBeGreaterThanOrEqual(10 - 0.1);
  });

  it('mover harita dışına çıkamaz', () => {
    const world = makeWorld([]);
    const p = makeMover(20, 20);
    world.movers.push(p);
    p.input.moveX = -1;
    p.input.moveY = -1;
    for (let i = 0; i < 300; i++) {
      movementSystem(world);
      physicsSystem(world);
    }
    expect(p.transform.x).toBeCloseTo(5);
    expect(p.transform.y).toBeCloseTo(5);
  });
});
