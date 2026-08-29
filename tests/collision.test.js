import { describe, it, expect } from 'vitest';
import { circleVsCircle, circleVsAabb } from '../src/core/collision.js';

describe('circleVsCircle', () => {
  it('uzak dairelerde null döner', () => {
    expect(circleVsCircle(0, 0, 5, 20, 0, 5)).toBeNull();
  });

  it('kesişen daireleri doğru derinlikle ayırır', () => {
    const hit = circleVsCircle(0, 0, 5, 8, 0, 5);
    expect(hit).not.toBeNull();
    expect(hit.depth).toBeCloseTo(2);
    expect(hit.nx).toBeCloseTo(-1); // A, B'den uzağa (sola) itilir
    expect(hit.ny).toBeCloseTo(0);
  });

  it('tam üst üste dairelerde sabit yönle iter (NaN üretmez)', () => {
    const hit = circleVsCircle(3, 3, 5, 3, 3, 5);
    expect(hit.depth).toBeCloseTo(10);
    expect(Number.isFinite(hit.nx)).toBe(true);
  });
});

describe('circleVsAabb', () => {
  it('değmeyen durumda null döner', () => {
    expect(circleVsAabb(50, 50, 5, 0, 0, 10, 10)).toBeNull();
  });

  it('kenardan iter', () => {
    const hit = circleVsAabb(13, 5, 5, 0, 0, 10, 10);
    expect(hit).not.toBeNull();
    expect(hit.nx).toBeCloseTo(1);
    expect(hit.depth).toBeCloseTo(2);
  });

  it('merkez kutu içindeyken en yakın yüzeye iter', () => {
    const hit = circleVsAabb(9, 5, 3, 0, 0, 10, 10);
    expect(hit).not.toBeNull();
    expect(hit.nx).toBeCloseTo(1); // sağ yüzey en yakın
  });
});
