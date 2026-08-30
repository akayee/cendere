import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob, createDummy } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { applyCard } from '../src/sim/systems/progressionSystem.js';
import { xpForLevel } from '../src/data/balance.js';
import { CARDS } from '../src/data/cards.js';

function setup() {
  const world = createWorld(888);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'cengaver', cx, cy);
  return { world, player, cx, cy };
}

describe('progressionSystem', () => {
  it('mob kesince XP kazanılır', () => {
    const { world, player, cx, cy } = setup();
    createMob(world, 'snake', cx + 12, cy);
    for (let i = 0; i < 600 && world.movers.length > 1; i++) step(world);
    expect(player.progress.xp).toBeGreaterThan(0);
  });

  it('XP dolunca seviye atlar, can FULLENİR, kart hakkı birikir, event yayınlanır', () => {
    const { world, player } = setup();
    const events = [];
    world.bus.on('player.levelup', (e) => events.push(e));
    player.health.hp = 30;
    player.progress.xp = xpForLevel(1) + xpForLevel(2); // iki seviyelik XP
    step(world);
    expect(player.progress.level).toBe(3);
    expect(player.progress.pendingCards).toBe(2);
    expect(player.health.hp).toBe(player.health.maxHp);
    expect(events.length).toBe(2);
  });

  it('kart akışı: istek → 3 kartlık kalıcı teklif → seçim etkiyi uygular', () => {
    const { world, player } = setup();
    player.progress.pendingCards = 1;
    let offered = null;
    world.bus.on('cards.offered', (e) => (offered = e.cards));

    player.input.wantCards = true;
    step(world);
    expect(offered).toHaveLength(3);

    // Tekrar açınca AYNI teklif (reroll kandırmacası yok)
    const first = [...offered];
    player.input.wantCards = true;
    step(world);
    expect(offered).toEqual(first);

    const baseSpeed = player.motion.speed;
    const baseDmg = player.combat.auto.damage;
    player.input.pickCard = 0;
    step(world);
    expect(player.progress.pendingCards).toBe(0);
    expect(player.progress.build).toEqual([first[0]]);
    // Seçilen kartın bir etkisi dokunmuş olmalı (hangi kart geldiyse)
    const changed =
      player.motion.speed !== baseSpeed ||
      player.combat.auto.damage !== baseDmg ||
      player.health.maxHp !== 100 ||
      player.combat.auto.cooldown !== 0.55 ||
      player.combat.auto.range !== 24 ||
      player.combat.skill.damage !== 12 ||
      player.combat.skill.cooldown !== 2.2 ||
      Object.values(player.combat.mods).some((v) => v !== 0);
    expect(changed).toBe(true);
  });

  it('hakkı yokken kart ekranı teklif üretmez', () => {
    const { world, player } = setup();
    let offered = false;
    world.bus.on('cards.offered', () => (offered = true));
    player.input.wantCards = true;
    step(world);
    expect(offered).toBe(false);
  });

  it('kukla: vuruş başına XP verir, ölmek yerine kırılır, beklemeden sonra onarılır', () => {
    const { world, player, cx, cy } = setup();
    const dummy = createDummy(world, cx + 12, cy);

    // Kırılana kadar döv
    let broken = false;
    world.bus.on('dummy.broken', () => (broken = true));
    for (let i = 0; i < 600 && !broken; i++) step(world);
    expect(broken).toBe(true);
    expect(world.entities.has(dummy.id)).toBe(true); // asla ölmedi
    expect(dummy.health.hp).toBe(0);
    expect(player.progress.xp).toBeGreaterThan(0);

    // Kırıkken vurmak XP vermez
    const xpWhileBroken = player.progress.xp;
    for (let i = 0; i < 60; i++) step(world);
    expect(player.progress.xp).toBe(xpWhileBroken);

    // Onarım süresi dolunca full canla geri gelir
    let repaired = false;
    world.bus.on('dummy.repaired', () => (repaired = true));
    for (let i = 0; i < 400 && !repaired; i++) step(world);
    expect(repaired).toBe(true);
    expect(dummy.health.hp).toBe(dummy.health.maxHp);

    // Kukla yerinden oynamamalı (knockback muaf)
    expect(dummy.transform.x).toBeCloseTo(cx + 12, 0);
  });

  it('XP kazanımı xp.gained event\'i yayınlar (uçan sayı için)', () => {
    const { world, cx, cy } = setup();
    createMob(world, 'snake', cx + 12, cy);
    const xpEvents = [];
    world.bus.on('xp.gained', (e) => xpEvents.push(e));
    for (let i = 0; i < 600 && !xpEvents.length; i++) step(world);
    expect(xpEvents.length).toBeGreaterThan(0);
    expect(xpEvents[0].amount).toBeGreaterThan(0);
  });

  it('unique kartlar (girdap/zehirli_kenar/yanki_becerisi) build\'deyken teklif havuzuna GİRMEZ', () => {
    // Bu kartların ikinci kopyası hiçbir şey vermez (boolean/set etkiler) — veri sözleşmesi
    const uniques = CARDS.filter((c) => c.unique).map((c) => c.id);
    expect(uniques.sort()).toEqual(['girdap', 'yanki_becerisi', 'zehirli_kenar']);
    // +1 mermi kartları İSTİFLENİR: unique olmamalı
    expect(CARDS.find((c) => c.id === 'catal_ok').unique).toBeUndefined();
    expect(CARDS.find((c) => c.id === 'cifte_kor').unique).toBeUndefined();

    const { world, player } = setup(); // cengaver: girdap havuzunda olurdu
    player.progress.build = [...uniques];
    player.progress.pendingCards = 6;
    let offer = null;
    world.bus.on('cards.offered', (e) => (offer = e.cards));
    // Birden çok teklif çevrimi: hiçbirinde sahip olunan unique çıkmamalı
    for (let r = 0; r < 6; r++) {
      offer = null;
      player.input.wantCards = true;
      step(world);
      expect(offer).toHaveLength(3);
      for (const id of offer) expect(uniques).not.toContain(id);
      player.input.pickCard = 0; // teklifi tüket ki bir sonraki tur yeniden çekilsin
      step(world);
    }
  });

  it('her kartın etkisi tanımlı alanlardan oluşur (veri sözleşmesi)', () => {
    const known = new Set([
      'maxHpAdd', 'speedMul', 'autoDamageAdd', 'autoCooldownMul', 'autoRangeAdd',
      'skillPowerMul', 'skillCooldownMul', 'armorAdd', 'critAdd', 'lifestealAdd',
      'regenAdd', 'killHealAdd',
      'autoArcFull', 'autoProjAdd', 'poisonOnHit', 'skillChargesSet',
    ]);
    for (const card of CARDS) {
      for (const key of Object.keys(card.effect)) {
        expect(known.has(key), `${card.id} bilinmeyen etki: ${key}`).toBe(true);
      }
    }
  });

  it('applyCard: Kalın Post canı ve azami canı artırır', () => {
    const { player } = setup();
    const base = player.health.maxHp;
    applyCard(player, 'kalin_post');
    expect(player.health.maxHp).toBe(base + 20);
    expect(player.health.hp).toBe(base + 20);
  });
});
