import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob, createResource } from '../src/sim/entity.js';
import { ZONE } from '../src/data/balance.js';

/** Test yardımcısı: N bot, GZ halkasında kendi üsleriyle (eski spawnBots muadili). */
function spawnBots(world, count) {
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  for (let i = 0; i < count; i++) {
    const a = (i / Math.max(count, 3)) * Math.PI * 2 + 0.3;
    const gx = cx + Math.cos(a) * ZONE.RING_RADIUS;
    const gy = cy + Math.sin(a) * ZONE.RING_RADIUS;
    const bot = createPlayer(world, ['cengaver', 'nisanci', 'ocakci'][i % 3], gx, gy, {
      bot: true,
      personality: { aggro: 0.6, greed: 0.7 },
      name: 'TestBot' + i,
    });
    world.gzones.push({ x: gx, y: gy, r: ZONE.PERSONAL_R, ownerId: bot.id });
  }
  world.match.playersTotal = count + 1;
}
import { step } from '../src/sim/pipeline.js';
import { PHASES } from '../src/data/phases.js';

function setup() {
  const world = createWorld(777);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'cengaver', cx, cy);
  return { world, player, cx, cy };
}

describe('M6 — botlar, PvP, kese, T2', () => {
  it('botlar doğar, hareket eder ve avlanıp XP kazanır', () => {
    const { world } = setup();
    spawnBots(world, 6);
    const bots = world.movers.filter((m) => m.botAi);
    expect(bots.length).toBe(6);

    // Her botun yakınına bir av bırak: avcılık davranışı devreye girmeli
    for (const b of bots) createMob(world, 'slime', b.transform.x + 60, b.transform.y);

    const startPos = bots.map((b) => ({ x: b.transform.x, y: b.transform.y }));
    for (let i = 0; i < 60 * 20; i++) step(world); // 20 sn
    const moved = bots.filter((b, i) => Math.hypot(b.transform.x - startPos[i].x, b.transform.y - startPos[i].y) > 30);
    expect(moved.length).toBeGreaterThan(3);
    const totalXp = bots.reduce((s, b) => s + b.progress.xp + (b.progress.level - 1) * 30, 0);
    expect(totalXp).toBeGreaterThan(0);
  }, 30000);

  it('bot seviye atlayınca kartı otomatik seçer', () => {
    const { world } = setup();
    spawnBots(world, 1);
    const bot = world.movers.find((m) => m.botAi);
    bot.progress.xp = 200;
    for (let i = 0; i < 240 && bot.progress.build.length === 0; i++) step(world);
    expect(bot.progress.build.length).toBeGreaterThan(0);
    expect(bot.progress.pendingCards).toBeLessThan(3);
  });

  it('PvP: bot KENDİ üssündeyken vurulamaz, dışarıda vurulur', () => {
    const { world, player, cx, cy } = setup();
    spawnBots(world, 1);
    const bot = world.movers.find((m) => m.botAi);
    const gz = world.gzones.find((g) => g.ownerId === bot.id);
    // Bot kendi üssünün ortasında; oyuncu dibinde (oyuncunun üssü değil → koruma yok ona)
    bot.transform.x = bot.transform.prevX = gz.x;
    bot.transform.y = bot.transform.prevY = gz.y;
    bot.botAi.thinkT = 9999; // bot kıpırdamasın
    bot.input.moveX = 0;
    bot.input.moveY = 0;
    player.transform.x = player.transform.prevX = gz.x + 12;
    player.transform.y = player.transform.prevY = gz.y;
    for (let i = 0; i < 90; i++) step(world);
    expect(bot.health.hp).toBe(bot.health.maxHp); // üs koruması

    // İkisini de üs dışına taşı (zindan tarafı)
    player.transform.x = player.transform.prevX = cx + 100;
    player.transform.y = player.transform.prevY = cy;
    bot.transform.x = bot.transform.prevX = cx + 112;
    bot.transform.y = bot.transform.prevY = cy;
    for (let i = 0; i < 90; i++) step(world);
    expect(bot.health.hp).toBeLessThan(bot.health.maxHp); // artık vurulabilir
  });

  it('ölen bot Ganimet Kesesi düşürür; kese kanalla açılır ve malzeme verir', () => {
    const { world, player, cx, cy } = setup();
    spawnBots(world, 2); // 2 bot: biri ölünce maç bitmesin
    const bot = world.movers.find((m) => m.botAi);
    bot.gather.wood = 4;
    bot.gather.ore = 2;
    bot.transform.x = bot.transform.prevX = cx + 500;
    bot.transform.y = bot.transform.prevY = cy;
    bot.health.hp = 1;
    bot.dead = true;
    step(world);
    const kese = world.resources.find((r) => r.resType === 'kese');
    expect(kese).toBeDefined();
    expect(kese.loot.wood).toBe(4);

    // Oyuncu kesenin başına gidip açar (otomatik kanal)
    player.transform.x = player.transform.prevX = kese.transform.x - 8;
    player.transform.y = player.transform.prevY = kese.transform.y;
    let opened = null;
    world.bus.on('kese.opened', (e) => (opened = e));
    for (let i = 0; i < 60 * 3 && !opened; i++) step(world);
    expect(opened).not.toBeNull();
    expect(player.gather.wood).toBeGreaterThanOrEqual(4);
  });

  it('bot açık alandaki keseyi kendisi bulup AÇAR (takılma düzeltmesi)', () => {
    const { world, cx, cy } = setup();
    spawnBots(world, 2);
    // İzole sahne: tüm mobları temizle (av, toplamayı bölmesin)
    for (const m of world.movers) if (m.kind === 'mob') m.dead = true;
    step(world);
    const bot = world.movers.find((m) => m.botAi);
    // Spawn-temiz merkez bölge: kesin engelsiz alan (harita üretiminden bağımsız)
    bot.transform.x = bot.transform.prevX = cx + 30;
    bot.transform.y = bot.transform.prevY = cy;
    const victim = world.movers.filter((m) => m.botAi)[1];
    victim.gather.wood = 3;
    victim.transform.x = victim.transform.prevX = cx + 60;
    victim.transform.y = victim.transform.prevY = cy;
    victim.dead = true;
    let opened = null;
    world.bus.on('kese.opened', (e) => (opened = e));
    for (let i = 0; i < 60 * 12 && !opened; i++) step(world);
    expect(opened).not.toBeNull();
    expect(opened.id).toBe(bot.id);
    expect(bot.gather.wood).toBeGreaterThanOrEqual(3);
  }, 20000);

  it('bot kanaldayken karar sistemi kanalı bozmaz (kanal koruması)', () => {
    const { world, cx, cy } = setup();
    spawnBots(world, 1);
    for (const m of world.movers) if (m.kind === 'mob') m.dead = true;
    step(world);
    const bot = world.movers.find((m) => m.botAi);
    bot.transform.x = bot.transform.prevX = cx + 400;
    bot.transform.y = bot.transform.prevY = cy;
    createResource(world, 'wood', cx + 410, cy);
    // Kanal başlayana kadar bekle, sonra kanal boyunca hiç kırılmadığını doğrula
    let started = false;
    let broken = 0;
    world.bus.on('gather.started', (e) => {
      if (e.id === bot.id && e.resType === 'wood') started = true;
    });
    world.bus.on('gather.broken', (e) => {
      if (e.id === bot.id) broken++;
    });
    let done = false;
    world.bus.on('gather.done', () => (done = true));
    for (let i = 0; i < 60 * 15 && !done; i++) step(world);
    expect(started).toBe(true);
    expect(done).toBe(true);
    expect(broken).toBe(0);
  }, 20000);

  it('Sürgün bot KENDİ üssünde OTURMAZ: bütçesi bitince dışarı çıkar', () => {
    const { world } = setup();
    spawnBots(world, 1);
    const bot = world.movers.find((m) => m.botAi);
    const gz = world.gzones.find((g) => g.ownerId === bot.id);
    bot.transform.x = bot.transform.prevX = gz.x;
    bot.transform.y = bot.transform.prevY = gz.y;
    bot.zone.gzBudget = 1; // birazdan Sürgün
    for (let i = 0; i < 60 * 12; i++) step(world);
    const d = Math.hypot(bot.transform.x - gz.x, bot.transform.y - gz.y);
    expect(d).toBeGreaterThan(gz.r); // üssünden çıktı
  }, 20000);

  it('geç oyunda (Son Cendere) botlar eşit güçteki rakibe de saldırır', () => {
    const { world, player, cx, cy } = setup();
    spawnBots(world, 1);
    for (const m of world.movers) if (m.kind === 'mob') m.dead = true;
    step(world);
    world.match.t = PHASES[3].start + 1; // Son Cendere: GZ yok
    const bot = world.movers.find((m) => m.botAi);
    bot.botAi.personality.aggro = 0.5;
    bot.transform.x = bot.transform.prevX = cx + 80;
    bot.transform.y = bot.transform.prevY = cy;
    player.combat.auto = { ...player.combat.auto, damage: 0 }; // insan susturuldu
    const hp0 = bot.health.hp;
    void hp0;
    for (let i = 0; i < 60 * 6 && player.health.hp === player.health.maxHp; i++) step(world);
    expect(player.health.hp).toBeLessThan(player.health.maxHp); // bot saldırdı
  }, 20000);

  it('son hayatta kalan insan olunca maç ZAFERLE biter', () => {
    const { world } = setup();
    spawnBots(world, 2);
    let ended = null;
    world.bus.on('match.ended', (e) => (ended = e));
    for (const b of world.movers.filter((m) => m.botAi)) b.dead = true;
    step(world);
    expect(ended?.win).toBe(true);
    expect(ended?.reason).toBe('lastAlive');
  });

  it('T2 kampları Genişleme evresiyle belirir', () => {
    const { world } = setup();
    world.match.t = PHASES[1].start - 0.5;
    const before = world.movers.filter((m) => m.ai?.def.tier === 2).length;
    expect(before).toBe(0);
    for (let i = 0; i < 60; i++) step(world);
    const after = world.movers.filter((m) => m.ai?.def.tier === 2).length;
    expect(after).toBeGreaterThanOrEqual(3 * 3);
  });

  it('Nişancı oku uzaktaki mobu vurur (mermi sistemi)', () => {
    const world = createWorld(555);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const archer = createPlayer(world, 'nisanci', cx, cy);
    const mob = createMob(world, 'slime', cx + 70, cy); // melee menzili dışı, ok menzili içi
    for (let i = 0; i < 120 && mob.health.hp === mob.health.maxHp; i++) step(world);
    expect(mob.health.hp).toBeLessThan(mob.health.maxHp);
    expect(archer.combat.auto.type).toBe('projectile');
  });

  it('Şaşmaz Ok: hedef varsa kilitlenir ve KAÇIRMAZ, hedef yoksa cooldown yanmaz', () => {
    const world = createWorld(557);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const archer = createPlayer(world, 'nisanci', cx, cy);

    // Hedef yok: beceri harcanmaz
    archer.input.wantSkill = true;
    step(world);
    expect(archer.combat.skillCd).toBe(0);
    expect(world.projectiles.length).toBe(0);

    // Kaçan hedef bile vurulur (homing)
    const mob = createMob(world, 'snake', cx + 100, cy);
    mob.ai.state = 'return'; // uzaklaşsın
    mob.ai.homeX = cx + 600;
    archer.combat.autoCd = 99; // normal oklar karışmasın
    archer.input.wantSkill = true;
    step(world);
    expect(archer.combat.skillCd).toBeGreaterThan(0);
    expect(world.projectiles.some((p) => p.homing)).toBe(true);
    for (let i = 0; i < 120 && mob.health.hp === mob.health.maxHp; i++) {
      archer.combat.autoCd = 99;
      step(world);
    }
    expect(mob.health.hp).toBeLessThanOrEqual(mob.health.maxHp - 17); // 7×2.5 → 18
  });

  it('Ağır Darbe kartı beceri gücünü sınıfa göre ölçekler', () => {
    const world = createWorld(558);
    const cx = world.map.widthPx / 2;
    const mage = createPlayer(world, 'ocakci', cx, cx);
    const baseDps = mage.combat.skill.dps;
    mage.progress.pendingCards = 1;
    mage.progress.offer = ['agir_darbe', 'kalin_post', 'seri_adim'];
    mage.input.pickCard = 0;
    step(world);
    expect(mage.combat.skill.dps).toBeCloseTo(baseDps * 1.3, 5);
  });

  it('Ocakçı alan yakması: bekleyen mobu yakar', () => {
    const world = createWorld(556);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const mage = createPlayer(world, 'ocakci', cx, cy);
    const mob = createMob(world, 'mushroom', cx + 10, cy);
    mob.ai.state = 'idle';
    mage.input.wantSkill = true;
    step(world);
    expect(world.areas.length).toBe(1);
    const hp0 = mob.health.hp;
    for (let i = 0; i < 90; i++) step(world);
    expect(mob.health.hp).toBeLessThan(hp0);
  });

  it('Alan Yakması UZAKTAKİ hedefin altına düşer (okçu kite kırıcı)', () => {
    const world = createWorld(559);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const mage = createPlayer(world, 'ocakci', cx, cy);
    const mob = createMob(world, 'slime', cx + 80, cy); // menzil ucundaki hedef
    mob.ai.state = 'idle';
    mage.input.wantSkill = true;
    step(world);
    expect(world.areas.length).toBe(1);
    const a = world.areas[0];
    expect(Math.hypot(a.x - mob.transform.x, a.y - mob.transform.y)).toBeLessThan(12); // hedefin altında
  });
});
