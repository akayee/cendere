import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob, createResource, createLootBag } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { applyDamage } from '../src/sim/systems/combatSystem.js';
import { ECON, COMBAT } from '../src/data/balance.js';

function setup(classId = 'cengaver') {
  const world = createWorld(999);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, classId, cx, cy);
  return { world, player, cx, cy };
}

const TICKS = (sec) => Math.ceil(sec * 60) + 2;

describe('gatherSystem — temasla anında toplama', () => {
  it('üstüne gelinen pickup ANINDA toplanır: durmak/kanal/kilit yok', () => {
    const { world, player, cx, cy } = setup();
    const res = createResource(world, 'atk', cx + 8, cy);
    player.input.moveX = 1; // yürürken bile toplar
    let done = null;
    world.bus.on('gather.done', (e) => (done = e));
    step(world);
    expect(done).not.toBeNull();
    expect(done.resType).toBe('atk');
    expect(world.entities.has(res.id)).toBe(false);
    expect(player.gather.channel).toBeNull(); // kanal hiç açılmadı
  });

  it('temas mesafesi dışındaki pickup toplanmaz', () => {
    const { world, player, cx, cy } = setup();
    const reach = player.body.radius + 4 + ECON.PICKUP_PAD;
    createResource(world, 'atk', cx + reach + 6, cy);
    step(world);
    expect(world.resources.length).toBe(1); // duruyor
    expect(player.gather.stats.atk).toBe(0);
  });

  it('atk pickup: saldırı hasarı ×1.04, sayaç artar', () => {
    const { world, player, cx, cy } = setup('ocakci'); // uzmanlık atk DEĞİL
    const base = player.combat.auto.damage;
    createResource(world, 'atk', cx + 8, cy);
    step(world);
    expect(player.combat.auto.damage).toBeCloseTo(base * ECON.ATK_DMG_MUL, 5);
    expect(player.gather.stats.atk).toBe(1);
  });

  it('armor pickup: anında +1 zırh', () => {
    const { world, player, cx, cy } = setup('ocakci');
    createResource(world, 'armor', cx + 8, cy);
    step(world);
    expect(player.combat.mods.armor).toBe(ECON.ARMOR_PER_PICKUP);
    expect(player.gather.stats.armor).toBe(1);
  });

  it('herb pickup: +1 pot; pot DOLUYKEN toplanmaz, yerde kalır', () => {
    const { world, player, cx, cy } = setup('cengaver');
    player.gather.pots = ECON.POT_MAX - 1;
    createResource(world, 'herb', cx + 8, cy);
    step(world);
    expect(player.gather.pots).toBe(ECON.POT_MAX);

    const res2 = createResource(world, 'herb', cx + 8, cy);
    for (let i = 0; i < 30; i++) step(world);
    expect(world.entities.has(res2.id)).toBe(true); // yerde kaldı
    expect(player.gather.pots).toBe(ECON.POT_MAX);
  });

  it('speed pickup: +%3 hız; cap (+%30) dolunca da TOPLANIR — etki durur, sayaç ilerler', () => {
    const { world, player, cx, cy } = setup();
    const base = player.motion.speed;
    createResource(world, 'speed', cx + 8, cy);
    step(world);
    expect(player.motion.speed).toBeCloseTo(base * (1 + ECON.SPEED_PER_PICKUP), 5);
    expect(player.gather.stats.speed).toBe(1);

    // Cap: 10 pickup'tan sonrası hız VERMEZ ama yerde kalmaz (eşik sayacı işler)
    const capCount = Math.round(ECON.SPEED_PICKUP_CAP / ECON.SPEED_PER_PICKUP);
    player.gather.stats.speed = capCount;
    const speedAtCap = player.motion.speed;
    const res2 = createResource(world, 'speed', cx + 8, cy);
    step(world);
    expect(world.entities.has(res2.id)).toBe(false); // toplandı
    expect(player.gather.stats.speed).toBe(capCount + 1); // sayaç ilerledi
    expect(player.motion.speed).toBeCloseTo(speedAtCap, 5); // hız artmadı
  });

  it('hız kartları + speed pickup üst üste binse de toplam hız tavanı aşılamaz', () => {
    const { world, player, cx, cy } = setup();
    player.motion.speed = player.motion.baseSpeed * ECON.SPEED_TOTAL_CAP; // kartlarla tavana dayandı
    createResource(world, 'speed', cx + 8, cy);
    step(world);
    expect(player.motion.speed).toBeLessThanOrEqual(player.motion.baseSpeed * ECON.SPEED_TOTAL_CAP + 1e-9);
  });

  it('sınıf uzmanlığı: kendi türündeki pickup etkisi ×2 (Cengâver=armor, Nişancı=atk, Ocakçı=herb)', () => {
    // Cengâver: zırh +2
    const a = setup('cengaver');
    createResource(a.world, 'armor', a.cx + 8, a.cy);
    step(a.world);
    expect(a.player.combat.mods.armor).toBe(ECON.ARMOR_PER_PICKUP * 2);

    // Nişancı: hasar ×1.04²
    const b = setup('nisanci');
    const baseDmg = b.player.combat.auto.damage;
    createResource(b.world, 'atk', b.cx + 8, b.cy);
    step(b.world);
    expect(b.player.combat.auto.damage).toBeCloseTo(baseDmg * ECON.ATK_DMG_MUL * ECON.ATK_DMG_MUL, 5);

    // Ocakçı: +2 pot
    const c = setup('ocakci');
    c.player.gather.pots = 0;
    createResource(c.world, 'herb', c.cx + 8, c.cy);
    step(c.world);
    expect(c.player.gather.pots).toBe(2);
  });

  it('toplanan kaynak yeniden doğar (respawnQueue)', () => {
    const { world, player, cx, cy } = setup();
    createResource(world, 'armor', cx + 8, cy);
    step(world);
    expect(world.resources.length).toBe(0);
    // Oyuncu uzaklaşsın ki yeniden doğan pickup'ı anında yutmasın
    player.transform.x = player.transform.prevX = cx + 300;
    for (let i = 0; i < TICKS(ECON.RESPAWN_TIME); i++) step(world);
    expect(world.resources.length).toBe(1);
    expect(world.resources[0].resType).toBe('armor');
  });

  it('savaşın ortasında bile normal pickup toplanır (yalnız kese bekler)', () => {
    const { world, player, cx, cy } = setup('ocakci');
    player.combat.inCombatT = COMBAT.IN_COMBAT_TIME; // az önce vuruştu
    createResource(world, 'atk', cx + 8, cy);
    step(world);
    expect(player.gather.stats.atk).toBe(1);
  });

  it('Ganimet Kesesi: savaş halindeyken AÇILMAZ, çatışmadan 0.5 sn sonra temasla açılır', () => {
    const { world, player, cx, cy } = setup();
    const victim = createPlayer(world, 'cengaver', cx + 400, cy);
    createLootBag(world, victim);
    const kese = world.resources.find((r) => r.resType === 'kese');
    kese.transform.x = cx + 8;
    kese.transform.y = cy;
    victim.transform.x = victim.transform.prevX = cx - 700; // kurban sahneden çekilsin

    let opened = null;
    world.bus.on('kese.opened', (e) => (opened = e));
    player.combat.inCombatT = COMBAT.IN_COMBAT_TIME; // tam şimdi çatıştı
    step(world);
    expect(opened).toBeNull(); // savaşın ortasında kazara açılmadı

    // LOOT_DELAY dolunca üstünde durmak yeter
    for (let i = 0; i < TICKS(COMBAT.LOOT_DELAY + 0.2) && !opened; i++) step(world);
    expect(opened).not.toBeNull();
    expect(opened.id).toBe(player.id);
  });

  it('yoğunlaşma: kanal can doldurur; hasar bozar (kanal altyapısı focus için kalır)', () => {
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

  it('yoğunlaşma: hareket bozar', () => {
    const { world, player } = setup();
    player.health.hp = 50;
    player.input.wantGather = true;
    step(world);
    expect(player.gather.channel?.type).toBe('focus');
    player.input.moveX = 1;
    step(world);
    expect(player.gather.channel).toBeNull();
  });

  it('pot: tüketir, zamana yayarak doldurur (mekanik değişmedi)', () => {
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
  });
});

describe('eşik ödülleri (milestone) — 20 pickup = kalıcı bonus + aura', () => {
  it('20. atk pickup: hasar ×1.25 bonusu, event ve aura — yalnız BİR kez', () => {
    const { world, player, cx, cy } = setup('ocakci'); // uzmanlık atk DEĞİL
    player.gather.stats.atk = ECON.MILESTONE_COUNT - 1;
    const events = [];
    world.bus.on('pickup.milestone', (e) => events.push(e));

    const base = player.combat.auto.damage;
    createResource(world, 'atk', cx + 8, cy);
    step(world);
    expect(player.gather.stats.atk).toBe(ECON.MILESTONE_COUNT);
    expect(player.combat.auto.damage).toBeCloseTo(base * ECON.ATK_DMG_MUL * ECON.MILESTONE_ATK_MUL, 5);
    expect(events).toHaveLength(1);
    expect(events[0].resType).toBe('atk');
    expect(events[0].id).toBe(player.id);
    expect(player.render.auras).toEqual(['atk']);

    // 21. pickup: normal etki sürer ama milestone TEKRAR tetiklenmez
    const after20 = player.combat.auto.damage;
    createResource(world, 'atk', cx + 8, cy);
    step(world);
    expect(player.combat.auto.damage).toBeCloseTo(after20 * ECON.ATK_DMG_MUL, 5);
    expect(events).toHaveLength(1);
    expect(player.render.auras).toEqual(['atk']);
  });

  it('20. armor pickup: ekstra +5 zırh', () => {
    const { world, player, cx, cy } = setup('ocakci'); // uzmanlık armor DEĞİL
    player.gather.stats.armor = ECON.MILESTONE_COUNT - 1;
    createResource(world, 'armor', cx + 8, cy);
    step(world);
    expect(player.combat.mods.armor).toBe(ECON.ARMOR_PER_PICKUP + ECON.MILESTONE_ARMOR_ADD);
    expect(player.render.auras).toEqual(['armor']);
  });

  it('20. speed pickup: cap sonrası bile +%10 milestone bonusu gelir', () => {
    const { world, player, cx, cy } = setup();
    player.gather.stats.speed = ECON.MILESTONE_COUNT - 1; // cap çoktan doldu (+%30'da durdu)
    const before = player.motion.speed;
    createResource(world, 'speed', cx + 8, cy);
    step(world);
    // Pickup başına +%3 işlemez (cap), milestone +%10 işler
    expect(player.motion.speed).toBeCloseTo(before * (1 + ECON.MILESTONE_SPEED_ADD), 5);
    expect(player.render.auras).toEqual(['speed']);
  });

  it('speed milestone mutlak ×1.5 hız tavanını AŞAMAZ', () => {
    const { world, player, cx, cy } = setup();
    player.motion.speed = player.motion.baseSpeed * ECON.SPEED_TOTAL_CAP; // kartlarla tavana dayandı
    player.gather.stats.speed = ECON.MILESTONE_COUNT - 1;
    createResource(world, 'speed', cx + 8, cy);
    step(world);
    expect(player.motion.speed).toBeLessThanOrEqual(player.motion.baseSpeed * ECON.SPEED_TOTAL_CAP + 1e-9);
  });

  it('birden fazla milestone: auras dizisinde üst üste okunur', () => {
    const { world, player, cx, cy } = setup('nisanci'); // uzmanlık atk: 19+1=20 yine tek sayım
    player.gather.stats.atk = ECON.MILESTONE_COUNT - 1;
    player.gather.stats.armor = ECON.MILESTONE_COUNT - 1;
    createResource(world, 'atk', cx + 8, cy);
    step(world);
    createResource(world, 'armor', cx + 8, cy);
    step(world);
    expect(player.render.auras).toEqual(['atk', 'armor']);
  });
});

describe('pot kapasitesi otomatik büyür (3 bitki → kapasite 4)', () => {
  it('3. bitkide kapasite 4 olur, 4. pot taşınır; event BİR kez yayınlanır', () => {
    const { world, player, cx, cy } = setup('cengaver');
    player.gather.pots = 2;
    player.gather.stats.herb = ECON.POT_UPGRADE_AT - 1; // 2 bitki toplanmıştı
    const events = [];
    world.bus.on('pot.upgraded', (e) => events.push(e));

    createResource(world, 'herb', cx + 8, cy);
    step(world);
    expect(player.gather.stats.herb).toBe(ECON.POT_UPGRADE_AT);
    expect(player.gather.potMax).toBe(ECON.POT_MAX_UPGRADED);
    expect(player.gather.pots).toBe(3);
    expect(events).toHaveLength(1);
    expect(events[0].potMax).toBe(ECON.POT_MAX_UPGRADED);

    // 4. pot taşınır: eski POT_MAX'ta (3) artık yerde kalmaz
    createResource(world, 'herb', cx + 8, cy);
    step(world);
    expect(player.gather.pots).toBe(ECON.POT_MAX_UPGRADED);
    expect(events).toHaveLength(1); // tekrar tetiklenmedi

    // Yeni kapasite (4) doluyken bitki yine yerde kalır
    const res = createResource(world, 'herb', cx + 8, cy);
    for (let i = 0; i < 10; i++) step(world);
    expect(world.entities.has(res.id)).toBe(true);
    expect(player.gather.pots).toBe(ECON.POT_MAX_UPGRADED);
  });

  it('canPickup ve pot ekleme GÜNCEL kapasiteyi kullanır (sabit POT_MAX değil)', () => {
    const { world, player, cx, cy } = setup('ocakci'); // uzmanlık: +2 pot
    player.gather.pots = ECON.POT_MAX; // eski kapasitede "dolu"
    player.gather.potMax = ECON.POT_MAX_UPGRADED; // kapasite büyümüş
    createResource(world, 'herb', cx + 8, cy);
    step(world);
    // pots < potMax olduğundan toplandı; ×2 pot bile tavanı (4) aşamadı
    expect(player.gather.pots).toBe(ECON.POT_MAX_UPGRADED);
  });
});
