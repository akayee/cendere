import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob, createDummy } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { CLASSES } from '../src/data/classes.js';
import { COMBAT } from '../src/data/balance.js';

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

  it('Atılma: menzilde rakip varken hedefe yönelir', () => {
    const { world, player, cx, cy } = setup();
    const foe = createPlayer(world, 'nisanci', cx + 80, cy);
    foe.combat.auto = { ...foe.combat.auto, damage: 0 };
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    player.input.moveY = -1; // yukarı yürüyor — ama atılma RAKİBE (sağa) gitmeli
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.dash).not.toBeNull();
    expect(player.combat.dash.dirX).toBeGreaterThan(0.9);
    expect(Math.abs(player.combat.dash.dirY)).toBeLessThan(0.3);
  });

  it('Atılma: rakip yokken hareket yönünde atılır — MOB hedef seçilmez', () => {
    const { world, player, cx, cy } = setup();
    createMob(world, 'slime', cx + 40, cy); // mob menzilde ama atlama hedefi DEĞİL
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    player.input.moveY = -1;
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.dash).not.toBeNull();
    expect(player.combat.dash.dirY).toBeLessThan(-0.9);
    expect(Math.abs(player.combat.dash.dirX)).toBeLessThan(0.1);
  });

  it('Atılma: leapRange dışındaki rakip hedeflenmez (regresyon)', () => {
    const { world, cx, cy } = setup();
    const foe = createPlayer(world, 'nisanci', cx + 200, cy); // 200 > leapRange 120
    foe.combat.auto = { ...foe.combat.auto, damage: 0 };
    const attacker = world.movers.find((e) => e.kind === 'player' && e !== foe);
    attacker.combat.auto = { ...attacker.combat.auto, damage: 0 };
    attacker.input.moveY = 1;
    attacker.input.wantSkill = true;
    step(world);
    expect(attacker.combat.dash.dirY).toBeGreaterThan(0.9);
  });

  it('Atılma: yakın rakipte hedefte durur (mesafe tavanı) ve dash hasarı iner', () => {
    const { world, cx, cy } = setup();
    const foe = createPlayer(world, 'nisanci', cx + 30, cy);
    foe.combat.auto = { ...foe.combat.auto, damage: 0 };
    const attacker = world.movers.find((e) => e.kind === 'player' && e !== foe);
    attacker.combat.auto = { ...attacker.combat.auto, damage: 0 };
    const x0 = attacker.transform.x;
    attacker.input.wantSkill = true;
    for (let i = 0; i < 15; i++) step(world);
    // Tam atılma ~70+ birim sürerdi; hedefe kilitli atılma ~30'da biter
    const traveled = Math.hypot(attacker.transform.x - x0, attacker.transform.y - cy);
    expect(traveled).toBeGreaterThan(15);
    expect(traveled).toBeLessThan(55);
    expect(foe.health.hp).toBe(foe.health.maxHp - attacker.combat.skill.damage);
  });

  it('Alan Yakması: %25 anında iner, kalan DoT ile toplam eski bütçeye eşdeğer kalır', () => {
    const { world, cx, cy } = setup();
    const caster = createPlayer(world, 'ocakci', cx + 300, cy + 300);
    caster.combat.auto = { ...caster.combat.auto, damage: 0 };
    const dummy = createDummy(world, cx + 320, cy + 300);
    dummy.health.hp = dummy.health.maxHp = 1000;
    caster.input.wantSkill = true;
    step(world);
    const s = CLASSES.ocakci.skill;
    const total = s.dps * s.areaDuration; // eski davranışın toplam hasar bütçesi
    const burst = Math.round(total * COMBAT.AREA_BURST_RATIO);
    // Atıldığı AN: bütçenin %25'i anında
    expect(1000 - dummy.health.hp).toBe(burst);
    // Alan süresi boyunca kalan %75 DoT olarak işler; toplam ≈ eski bütçe
    for (let i = 0; i < Math.ceil((s.areaDuration + 0.5) * 60); i++) step(world);
    const lost = 1000 - dummy.health.hp;
    expect(lost).toBeGreaterThanOrEqual(total * 0.85);
    expect(lost).toBeLessThanOrEqual(total * 1.2);
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
