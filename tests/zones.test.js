import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { ZONE } from '../src/data/balance.js';
import { PHASES, MATCH_END, cendereRadiusAt, gzRadiusAt, cendereDpsAt } from '../src/data/phases.js';

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

  it('GZ Sıkışma boyunca erir, Son Cendere\'de sıfırdır', () => {
    expect(gzRadiusAt(0)).toBe(PHASES[0].gz);
    expect(gzRadiusAt(PHASES[2].start - 1)).toBeCloseTo(PHASES[2].gz, 0);
    expect(gzRadiusAt(PHASES[3].start + 1)).toBe(0);
  });

  it('Ani Ölüm hasarı 15 sn\'de bir katlanır ve tavana çarpar', () => {
    const start = PHASES[4].start;
    expect(cendereDpsAt(start)).toBe(20);
    expect(cendereDpsAt(start + 16)).toBe(40);
    expect(cendereDpsAt(start + 31)).toBe(80);
    expect(cendereDpsAt(start + 300)).toBeLessThanOrEqual(120);
  });
});

describe('zoneSystem', () => {
  it('evre değişince event yayınlanır', () => {
    const { world } = setup(178);
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
    const hp0 = player.health.hp;
    for (let i = 0; i < 120; i++) step(world); // merkezde
    expect(player.health.hp).toBe(hp0);
  });

  /** Oyuncuya bulunduğu noktada kişisel GZ ver (yeni model test yardımcısı) */
  function giveGz(world, player) {
    const gz = { x: player.transform.x, y: player.transform.y, r: ZONE.PERSONAL_R, ownerId: player.id };
    world.gzones.push(gz);
    return gz;
  }

  it('kendi GZ\'n CAN BASAR; bütçe erir, biterse Sürgün; dışarıda dolup Sürgün kalkar', () => {
    const { world, player } = setup();
    const gz = giveGz(world, player);
    player.health.hp = 60;
    for (let i = 0; i < 60 * 3; i++) step(world);
    expect(player.health.hp).toBeGreaterThan(60 + ZONE.GZ_HEAL * 2); // üs iyileştirdi

    player.zone.gzBudget = 1; // neredeyse bitmiş
    let exiled = false;
    let lifted = false;
    world.bus.on('zone.exiled', () => (exiled = true));
    world.bus.on('zone.exileLifted', () => (lifted = true));
    for (let i = 0; i < 90; i++) step(world); // üs içinde 1.5 sn
    expect(exiled).toBe(true);

    // Uzağa çık: bütçe dolmaya başlar, EXILE_LIFT'e ulaşınca Sürgün kalkar
    player.transform.x = player.transform.prevX = gz.x - 300;
    const need = ZONE.EXILE_LIFT * ZONE.GZ_REFILL_RATIO; // sn
    for (let i = 0; i < (need + 3) * 60 && !lifted; i++) step(world);
    expect(lifted).toBe(true);
    expect(player.zone.exiled).toBe(false);
  }, 20000);

  it('başkasının GZ\'si koruma da can da VERMEZ', () => {
    const { world, player } = setup();
    // Sahipsiz/yabancı bir GZ dairesi tam üstünde
    world.gzones.push({ x: player.transform.x, y: player.transform.y, r: ZONE.PERSONAL_R, ownerId: 99999 });
    player.health.hp = 60;
    const budget0 = player.zone.gzBudget;
    for (let i = 0; i < 60 * 2; i++) step(world);
    expect(player.health.hp).toBeLessThanOrEqual(60); // iyileşme yok
    expect(player.zone.gzBudget).toBeGreaterThanOrEqual(budget0); // bütçe de erimez
  });

  it('bütçe bitince kendi GZ\'n seni FİZİKSEL olarak dışarı iter ve kalırken yakar', () => {
    const { world, player } = setup();
    const gz = giveGz(world, player);
    player.zone.gzBudget = 0.5;
    const hp0 = player.health.hp;
    for (let i = 0; i < 60 * 5; i++) step(world);
    const d = Math.hypot(player.transform.x - gz.x, player.transform.y - gz.y);
    expect(d).toBeGreaterThan(gz.r); // atıldı
    expect(player.health.hp).toBeLessThan(hp0); // içeride geçen sürenin yanma cezası
  });

  it('itilmeye DİRENEN oyuncu da üsten çıkar (itiş yürüme hızından güçlü)', () => {
    const { world, player } = setup();
    const gz = giveGz(world, player);
    player.zone.gzBudget = 0;
    player.zone.exiled = true;
    for (let i = 0; i < 60 * 8; i++) {
      const dx = gz.x - player.transform.x;
      const dy = gz.y - player.transform.y;
      const dl = Math.hypot(dx, dy) || 1;
      player.input.moveX = dx / dl; // üssün merkezine doğru bastırıyor
      player.input.moveY = dy / dl;
      step(world);
    }
    const d = Math.hypot(player.transform.x - gz.x, player.transform.y - gz.y);
    expect(d).toBeGreaterThan(gz.r);
  }, 15000);

  it('Ani Ölüm iyileştirmeyi yarıya indirir (healMult)', () => {
    const { world } = setup(PHASES[4].start + 1);
    step(world);
    expect(world.healMult).toBe(0.5);
  });

  it('20:00 dolunca maç biter', () => {
    const { world } = setup(MATCH_END - 1);
    let ended = null;
    world.bus.on('match.ended', (e) => (ended = e));
    for (let i = 0; i < 120 && !ended; i++) step(world);
    expect(ended?.win).toBe(true);
    expect(world.match.over).toBe(true);
  });
});
