import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';

function setup() {
  const world = createWorld(555);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'cengaver', cx, cy);
  return { world, player, cx, cy };
}

describe('combatSystem', () => {
  it('otomatik saldırı menzildeki moba hasar verir ve mob saldırgana kilitlenir', () => {
    const { world, player, cx, cy } = setup();
    const mob = createMob(world, 'slime', cx + 15, cy);
    step(world);
    expect(mob.health.hp).toBeLessThan(mob.health.maxHp);
    expect(mob.ai.state).toBe('chase');
    expect(mob.ai.targetId).toBe(player.id);
  });

  it('menzil dışındaki moba vurulmaz', () => {
    const { world, cx, cy } = setup();
    const mob = createMob(world, 'slime', cx + 200, cy);
    for (let i = 0; i < 60; i++) step(world);
    expect(mob.health.hp).toBe(mob.health.maxHp);
  });

  it('mob ölünce dünyadan kaldırılır ve entity.died yayınlanır', () => {
    const { world, cx, cy } = setup();
    const mob = createMob(world, 'snake', cx + 12, cy);
    const died = [];
    world.bus.on('entity.died', (e) => died.push(e));
    for (let i = 0; i < 600 && !died.length; i++) step(world);
    expect(died.length).toBe(1);
    expect(died[0].kind).toBe('mob');
    expect(world.entities.has(mob.id)).toBe(false);
    expect(world.movers.includes(mob)).toBe(false);
  });

  it('kovalayan mob oyuncuya temas hasarı verir', () => {
    const { world, player, cx, cy } = setup();
    // Mobu elle kilitle (pasiflik testi ayrı): hemen bitişik doğsun
    const mob = createMob(world, 'mushroom', cx + 9, cy);
    mob.ai.state = 'chase';
    mob.ai.targetId = player.id;
    // Oyuncunun saldırısını sustur ki mob ölmeden vursun
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    for (let i = 0; i < 120; i++) step(world);
    expect(player.health.hp).toBeLessThan(player.health.maxHp);
  });

  it('Atılma: cooldown tüketir ve yoldaki moba hasar verir', () => {
    const { world, player, cx, cy } = setup();
    const mob = createMob(world, 'slime', cx + 30, cy);
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    player.input.moveX = 1;
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.skillCd).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) step(world);
    expect(mob.health.hp).toBe(mob.health.maxHp - player.combat.skill.damage);
  });

  it('oyuncu ölünce maç biter (BR: ölüm kalıcı)', () => {
    const { world, player } = setup();
    player.health.hp = 1;
    const mob = createMob(world, 'snake', player.transform.x + 8, player.transform.y);
    mob.ai.state = 'chase';
    mob.ai.targetId = player.id;
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    let ended = null;
    world.bus.on('match.ended', (e) => (ended = e));
    for (let i = 0; i < 300 && !ended; i++) step(world);
    expect(ended).not.toBeNull();
    expect(ended.win).toBe(false);
    expect(world.match.over).toBe(true);
  });
});
