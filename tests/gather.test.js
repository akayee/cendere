import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob, createResource } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { applyDamage } from '../src/sim/systems/combatSystem.js';
import { ECON, MAP, ZONE } from '../src/data/balance.js';
import { isWild } from '../src/sim/zone.js';

function setup() {
  const world = createWorld(999);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'cengaver', cx, cy);
  return { world, player, cx, cy };
}

const TICKS = (sec) => Math.ceil(sec * 60) + 2;

describe('gatherSystem — kanal + kilit', () => {
  it('OTOMATİK toplama: menzilde dururken kanal kendiliğinden başlar', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'wood', cx + 10, cy);
    step(world); // hiçbir input yok — sadece duruyor
    expect(player.gather.channel?.type).toBe('resource');
    expect(res.lockedBy).toBe(player.id);
  });

  it('pot doluyken bitki OTOMATİK toplanmaz (israf koruması)', () => {
    const { world, player, cx, cy } = setup();
    player.gather.pots = 3;
    createResource(world, 'herb', cx + 10, cy);
    step(world);
    expect(player.gather.channel).toBeNull();
  });

  it('kanal tamamlanınca malzeme verir, kaynak kalkar ve sonra yeniden doğar', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'wood', cx + 10, cy);
    const startResCount = world.resources.length;

    player.input.wantGather = true;
    step(world);
    expect(player.gather.channel).not.toBeNull();
    expect(res.lockedBy).toBe(player.id);

    for (let i = 0; i < TICKS(ECON.GATHER_TIME); i++) step(world);
    expect(player.gather.wood).toBeGreaterThan(0);
    expect(world.entities.has(res.id)).toBe(false);
    expect(world.resources.length).toBe(startResCount - 1);

    for (let i = 0; i < TICKS(ECON.RESPAWN_TIME); i++) step(world);
    expect(world.resources.length).toBe(startResCount);
  });

  it('hasar kanalı bozar; savaş hali geçince oto-toplama yeniden başlar', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'ore', cx + 10, cy);
    const mob = createMob(world, 'slime', cx + 400, cy); // uzakta, karışmasın

    step(world); // otomatik kanal başlar
    expect(res.lockedBy).toBe(player.id);
    for (let i = 0; i < 60; i++) step(world); // ~1 sn ilerleme birikir
    expect(player.gather.channel.t).toBeGreaterThan(0.5);

    let broken = false;
    world.bus.on('gather.broken', () => (broken = true));
    applyDamage(world, player, 3, mob);
    step(world);
    expect(broken).toBe(true); // kanal kırıldı...
    expect(player.gather.ore).toBe(0); // ...malzeme yok...
    expect(player.gather.channel).toBeNull(); // savaş halindeyken oto-restart YOK (spam önlemi)

    // Savaş hali (3 sn) geçince dururken kendiliğinden yeniden başlar
    for (let i = 0; i < 60 * 3.5; i++) step(world);
    expect(player.gather.channel?.type).toBe('resource');
  });

  it('hasar + kaçış: kilit düşer, kaynak gaspa açık kalır', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'ore', cx + 10, cy);
    const mob = createMob(world, 'slime', cx + 400, cy);
    step(world);
    applyDamage(world, player, 3, mob);
    player.input.moveX = 1; // vurulan oyuncu kaçıyor
    step(world);
    expect(player.gather.channel).toBeNull();
    expect(res.lockedBy).toBe(0);
  });

  it('hareket kanalı bozar', () => {
    const { world, player, cx, cy } = setup();
    createResource(world, 'wood', cx + 10, cy);
    player.input.wantGather = true;
    step(world);
    player.input.moveX = 1;
    step(world);
    expect(player.gather.channel).toBeNull();
  });

  it('kilitli kaynağa ikinci kişi kanal açamaz', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'wood', cx + 10, cy);
    player.input.wantGather = true;
    step(world);
    expect(res.lockedBy).toBe(player.id);

    const rival = createPlayer(world, 'cengaver', cx + 16, cy);
    rival.input.wantGather = true;
    step(world);
    // Rakip kaynağı alamaz; (canı tam olduğundan yoğunlaşma da başlamaz)
    expect(rival.gather.channel).toBeNull();
    expect(res.lockedBy).toBe(player.id);
  });

  it('yoğunlaşma: kaynak yokken kanal can doldurur, hasar bozar', () => {
    const { world, player } = setup();
    player.health.hp = 50;
    player.input.wantGather = true;
    step(world);
    expect(player.gather.channel?.type).toBe('focus');

    for (let i = 0; i < TICKS(ECON.FOCUS_TICK * 3); i++) step(world);
    expect(player.health.hp).toBeGreaterThanOrEqual(50 + ECON.FOCUS_HEAL * 2);

    const mob = createMob(world, 'slime', player.transform.x + 300, player.transform.y);
    applyDamage(world, player, 3, mob);
    step(world);
    expect(player.gather.channel).toBeNull();
  });

  it('pot: tüketir, zamana yayarak doldurur, üst sınır 3', () => {
    const { world, player } = setup();
    player.health.hp = 40;
    player.gather.pots = 2;
    player.input.wantPot = true;
    step(world);
    expect(player.gather.pots).toBe(1);
    expect(player.gather.potEffect).not.toBeNull();

    const before = player.health.hp;
    for (let i = 0; i < TICKS(ECON.POT_DURATION); i++) step(world);
    expect(player.health.hp).toBeGreaterThan(before + 20); // ~30 can

    player.gather.pots = ECON.POT_MAX;
    const { cx, cy } = { cx: player.transform.x, cy: player.transform.y };
    createResource(world, 'herb', cx + 10, cy);
    player.input.wantGather = true;
    step(world);
    for (let i = 0; i < TICKS(ECON.GATHER_TIME); i++) step(world);
    expect(player.gather.pots).toBe(ECON.POT_MAX); // taşma yok
  });

  it('otomatik işleme: 5 cevher → +1 zırh, 5 kereste → hasar ×1.02', () => {
    const { world, player, cx, cy } = setup();
    const baseDmg = player.combat.auto.damage;
    player.gather.ore = 4;
    player.gather.wood = 4;
    createResource(world, 'ore', cx + 10, cy);
    player.input.wantGather = true;
    step(world);
    for (let i = 0; i < TICKS(ECON.GATHER_TIME); i++) step(world);
    expect(player.gather.ore).toBeGreaterThanOrEqual(5);
    expect(player.combat.mods.armor).toBe(1);

    createResource(world, 'wood', player.transform.x + 10, player.transform.y);
    player.input.wantGather = true;
    step(world);
    for (let i = 0; i < TICKS(ECON.GATHER_TIME); i++) step(world);
    expect(player.combat.auto.damage).toBeCloseTo(baseDmg * ECON.WOOD_DMG_MUL, 5);
  });

  it('Vahşi Bölge: XP ×2 ve kaynak verimi ×2', () => {
    const { world, player, cx, cy } = setup();
    const wildX = cx + (ZONE.GZ_RADIUS_TILES + 8) * MAP.TILE;
    expect(isWild(world, wildX, cy)).toBe(true);
    expect(isWild(world, cx, cy)).toBe(false);

    // Vahşi'de kaynak: 2 birim verir
    player.transform.x = wildX;
    player.transform.prevX = wildX;
    createResource(world, 'wood', wildX + 10, cy);
    player.input.wantGather = true;
    step(world);
    for (let i = 0; i < TICKS(ECON.GATHER_TIME); i++) step(world);
    expect(player.gather.wood).toBe(ZONE.WILD_YIELD_MULT);

    // Vahşi'de mob: XP ×2
    const events = [];
    world.bus.on('xp.gained', (e) => events.push(e));
    const mob = createMob(world, 'slime', wildX, cy + 10);
    mob.health.hp = 1;
    for (let i = 0; i < 120 && !events.length; i++) step(world);
    expect(events[0].amount).toBe(12 * ZONE.WILD_XP_MULT);
  });
});
