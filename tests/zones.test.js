import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { PHASES, MATCH_END, cendereRadiusAt, cendereDpsAt } from '../src/data/phases.js';

function setup(t = 0) {
  const world = createWorld(4242);
  const player = createPlayer(world, 'cengaver', world.map.widthPx / 2, world.map.heightPx / 2);
  world.match.t = t;
  return { world, player };
}

describe('phases.js çizelgesi', () => {
  it('cendere yarıçapı zamanla tekdüze daralır', () => {
    let prev = Infinity;
    for (let t = 0; t <= MATCH_END; t += 30) {
      const r = cendereRadiusAt(t);
      expect(r).toBeLessThanOrEqual(prev + 0.001);
      prev = r;
    }
    expect(cendereRadiusAt(MATCH_END)).toBeLessThan(100);
  });

  it('kısaltılmış çizelge tutarlı: başlangıçlar kesin artan ve MATCH_END içinde', () => {
    // Toplam süre ~%15 kısaltıldı (480 → 408); evre başlangıçları oransal kaydı
    expect(MATCH_END).toBe(408);
    expect(PHASES[0].start).toBe(0);
    for (let i = 1; i < PHASES.length; i++) {
      expect(PHASES[i].start).toBeGreaterThan(PHASES[i - 1].start);
      expect(PHASES[i].start).toBeLessThan(MATCH_END);
      // Cendere hasarı evre ilerledikçe asla azalmaz
      expect(PHASES[i].dps).toBeGreaterThanOrEqual(PHASES[i - 1].dps);
    }
  });

  it('yarıçap eğrisi evre sınırlarında süreklidir (sıçrama yok)', () => {
    for (let i = 1; i < PHASES.length; i++) {
      const t = PHASES[i].start;
      // Sınırın hemen öncesi ile evre başlangıç yarıçapı örtüşmeli
      expect(Math.abs(cendereRadiusAt(t - 0.001) - PHASES[i].radius)).toBeLessThan(1);
      expect(cendereRadiusAt(t)).toBeCloseTo(PHASES[i].radius, 1);
    }
  });

  it('Ani Ölüm hasarı 15 sn\'de bir katlanır ve tavana çarpar', () => {
    const start = PHASES[4].start;
    expect(cendereDpsAt(start)).toBe(20);
    expect(cendereDpsAt(start + 16)).toBe(40);
    expect(cendereDpsAt(start + 31)).toBe(80);
    expect(cendereDpsAt(start + 300)).toBeLessThanOrEqual(120);
  });
});

describe('zoneSystem — cendere (kişisel GZ\'ler kaldırıldı)', () => {
  it('evre değişince event yayınlanır', () => {
    const { world } = setup(PHASES[1].start - 2); // Genişleme'ye 2 sn kala
    const events = [];
    world.bus.on('zone.phaseChanged', (e) => events.push(e.phase));
    for (let i = 0; i < 240; i++) step(world);
    expect(events).toContain('genisleme');
  });

  it('cendere dışında kalan hasar yer', () => {
    const { world, player } = setup(PHASES[3].start + 5); // Son Cendere: R ~380
    // Oyuncuyu çemberin çok dışına koy
    player.transform.x = player.transform.prevX = world.map.widthPx / 2 + 900;
    const hp0 = player.health.hp;
    for (let i = 0; i < 120; i++) step(world); // 2 sn
    expect(player.health.hp).toBeLessThan(hp0);
  });

  it('cendere içindeyken hasar yok', () => {
    const { world, player } = setup(PHASES[3].start + 5);
    // Zindan yoğunlaştı: merkezdeki moblar saldırabilir — test yalnız
    // CENDERE hasarını ölçer (çember içinde cendere yakmamalı).
    let cendereHits = 0;
    world.bus.on('cendere.damage', (e) => e.id === player.id && cendereHits++);
    for (let i = 0; i < 120; i++) step(world); // merkezde
    expect(cendereHits).toBe(0);
  });

  it('cendere hasarı yoğunlaşma kanalını bozar', () => {
    const { world, player } = setup(PHASES[3].start + 5);
    player.transform.x = player.transform.prevX = world.map.widthPx / 2 + 900;
    player.health.hp = 60;
    player.input.wantGather = true;
    step(world);
    expect(player.gather.channel?.type).toBe('focus');
    let broken = false;
    world.bus.on('gather.broken', (e) => e.reason === 'hasar' && (broken = true));
    for (let i = 0; i < 120 && !broken; i++) step(world);
    expect(broken).toBe(true);
  });

  it('Ani Ölüm iyileştirmeyi yarıya indirir (healMult)', () => {
    const { world } = setup(PHASES[4].start + 1);
    step(world);
    expect(world.healMult).toBe(0.5);
  });

  it('süre dolunca maç biter', () => {
    const { world } = setup(MATCH_END - 1);
    let ended = null;
    world.bus.on('match.ended', (e) => (ended = e));
    for (let i = 0; i < 120 && !ended; i++) step(world);
    expect(ended?.win).toBe(true);
    expect(world.match.over).toBe(true);
  });
});
