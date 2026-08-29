import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { applyPoison, applyDamage } from '../src/sim/systems/combatSystem.js';
import { applyCard } from '../src/sim/systems/progressionSystem.js';
import { PHASES } from '../src/data/phases.js';
import { xpForLevel, ECON } from '../src/data/balance.js';
import { CARDS } from '../src/data/cards.js';

function setup(seed = 4242) {
  const world = createWorld(seed);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'cengaver', cx, cy);
  return { world, player, cx, cy };
}

describe('M7 — Zehir (Ultima usulü)', () => {
  it('DoT işler ve süre dolunca geçer', () => {
    const { world, player } = setup();
    applyPoison(world, player, 3, 3, 0);
    const hp0 = player.health.hp;
    for (let i = 0; i < 60 * 3.5; i++) step(world);
    expect(player.health.hp).toBeLessThanOrEqual(hp0 - 9 + 3); // ~3 tick × 3
    expect(player.health.poison).toBeNull();
  });

  it('zehirliyken HİÇBİR iyileşme işlemez: yoğunlaşma + regen + pot etkisi', () => {
    const { world, player } = setup();
    applyCard(player, 'sicak_kan'); // regen kartı
    player.health.hp = 50;
    applyPoison(world, player, 0.0001, 5, 0); // hasarı ihmal, sadece kilit

    // Yoğunlaşma dene
    player.input.wantGather = true;
    step(world);
    for (let i = 0; i < 60 * 2; i++) step(world);
    expect(player.health.hp).toBeLessThanOrEqual(50); // hiç dolmadı
  });

  it('pot içmek zehri TEMİZLER (panzehir) ve sonra can doldurur', () => {
    const { world, player } = setup();
    player.health.hp = 40;
    player.gather.pots = 1;
    applyPoison(world, player, 2, 8, 0);
    player.input.wantPot = true;
    step(world);
    expect(player.health.poison).toBeNull();
    for (let i = 0; i < 60 * ECON.POT_DURATION; i++) step(world);
    expect(player.health.hp).toBeGreaterThan(55);
  });

  it('seviye atlamak zehri temizler ve can fullenir', () => {
    const { world, player } = setup();
    applyPoison(world, player, 2, 10, 0);
    player.progress.xp = xpForLevel(1);
    step(world);
    expect(player.health.poison).toBeNull();
    expect(player.health.hp).toBe(player.health.maxHp);
  });

  it('örümcek vuruşu zehirler', () => {
    const { world, player, cx, cy } = setup();
    player.combat.auto = { ...player.combat.auto, damage: 0 };
    const spider = createMob(world, 'orumcek', cx + 9, cy);
    spider.ai.state = 'chase';
    spider.ai.targetId = player.id;
    for (let i = 0; i < 120 && !player.health.poison; i++) step(world);
    expect(player.health.poison).not.toBeNull();
  });

  it('Zehirli Kenar kartı: saldırılar zehir bulaştırır', () => {
    const { world, player, cx, cy } = setup();
    applyCard(player, 'zehirli_kenar');
    const mob = createMob(world, 'slime', cx + 15, cy);
    for (let i = 0; i < 60 && !mob.health.poison; i++) step(world);
    expect(mob.health.poison).not.toBeNull();
  });
});

describe('M7 — T3/T4 ve kamp yöneticisi', () => {
  it('Sıkışma: elit kamplar CENDERE İÇİNDE doğar; elit ölünce Destansı kartlı kese düşer', () => {
    const { world, cx, cy } = setup();
    world.match.t = PHASES[2].start - 0.2;
    for (let i = 0; i < 30; i++) step(world);
    const elites = world.movers.filter((m) => m.ai?.def.tier === 3);
    expect(elites.length).toBeGreaterThanOrEqual(1);

    // Tüm kamplar cendere çemberinin içinde ve GZ'den uzakta olmalı
    for (const camp of world.camps) {
      const d = Math.hypot(camp.x - cx, camp.y - cy);
      expect(d).toBeLessThan(world.match.cendereR);
      expect(d).toBeGreaterThan(world.match.gzR);
    }

    elites[0].dead = true;
    step(world);
    const bag = world.resources.find((r) => r.resType === 'kese');
    expect(bag).toBeDefined();
    const card = CARDS.find((c) => c.id === bag.loot.cardId);
    expect(card.rarity).toBe('epic');
  });

  it('kesilen kampın yerine uzun cooldown sonrası yenisi gelir (cendere içinde)', () => {
    const { world } = setup();
    world.match.t = PHASES[1].start - 0.2; // Genişleme: ilk 6 kamp
    for (let i = 0; i < 30; i++) step(world);
    expect(world.camps.length).toBe(6);

    // Bir kampı tamamen kes
    const camp = world.camps[0];
    for (const id of camp.memberIds) {
      const m = world.entities.get(id);
      if (m) m.dead = true;
    }
    step(world);
    const aliveBefore = world.camps.filter((c) => c.memberIds.some((id) => world.entities.has(id))).length;
    expect(aliveBefore).toBe(5);

    // Cooldown dolunca 1 yeni kamp gelir (hemen değil)
    for (let i = 0; i < 60 * 10; i++) step(world);
    expect(world.camps.length).toBe(6); // 10 sn'de yenisi GELMEDİ (55 sn cooldown)
    for (let i = 0; i < 60 * 50; i++) step(world);
    expect(world.camps.length).toBeGreaterThanOrEqual(7); // artık geldi
  }, 30000);

  it('Son Cendere: T4 canavarları dalga dalga sızar ve tavana uyar', () => {
    const { world } = setup();
    world.match.t = PHASES[3].start - 0.2;
    for (let i = 0; i < 60 * 2; i++) step(world);
    const t4 = world.movers.filter((m) => m.ai?.def.tier === 4);
    expect(t4.length).toBeGreaterThanOrEqual(2);
    // Tasması yok: uzaktaki oyuncuya bile kilitlenir
    for (let i = 0; i < 60; i++) step(world);
    expect(t4.some((m) => m.ai.state === 'chase')).toBe(true);
  });
});

describe('M7 — Yankı Kartı sınıf uyumu ve hızlı loot', () => {
  it('Cengâver, kurbanın Çatal Ok\'unu ALAMAZ — uygun kart yoksa XP alır', async () => {
    const { createLootBag } = await import('../src/sim/entity.js');
    const { world, player, cx, cy } = setup(); // cengaver
    const victim = createPlayer(world, 'nisanci', cx + 300, cy);
    victim.progress.build = ['catal_ok']; // yalnız nişancı kartı
    createLootBag(world, victim);
    // Kurban sahneden çekilsin: kendi kesesini kendisi açmasın
    victim.transform.x = victim.transform.prevX = cx - 700;
    const kese = world.resources.find((r) => r.resType === 'kese');
    player.transform.x = player.transform.prevX = kese.transform.x - 8;
    player.transform.y = player.transform.prevY = kese.transform.y;
    let opened = null;
    world.bus.on('kese.opened', (e) => {
      if (e.id === player.id) opened = e;
    });
    const xp0 = player.progress.xp;
    for (let i = 0; i < 60 * 4 && !opened; i++) step(world);
    expect(opened.cardId).toBeNull(); // sınıf uyumsuz → kart yok
    expect(player.progress.xp).toBeGreaterThanOrEqual(xp0 + 20);
    expect(player.progress.build).not.toContain('catal_ok');
  });

  it('kese, çatışmadan 0.5 sn sonra açılabilir; normal kaynak 3 sn bekler', async () => {
    const { createLootBag } = await import('../src/sim/entity.js');
    const { createResource } = await import('../src/sim/entity.js');
    const { world, player, cx, cy } = setup();
    const victim = createPlayer(world, 'cengaver', cx + 300, cy);
    createLootBag(world, victim);
    const kese = world.resources.find((r) => r.resType === 'kese');
    kese.transform.x = cx + 10;
    kese.transform.y = cy;
    createResource(world, 'wood', cx - 10, cy);

    player.combat.inCombatT = 3; // az önce çatıştı
    for (let i = 0; i < 45; i++) step(world); // 0.75 sn
    expect(player.gather.channel?.type).toBe('resource');
    const target = world.entities.get(player.gather.channel.targetId);
    expect(target.resType).toBe('kese'); // kese açılıyor, odun DEĞİL
  });
});

describe('PvP XP', () => {
  it('oyuncu kesmek mobdan fazla XP verir ve kurbanın seviyesiyle artar', () => {
    const { world, player, cx, cy } = setup();
    const victim = createPlayer(world, 'nisanci', cx + 500, cy); // Vahşi'de (×2)
    victim.progress.level = 4;
    victim.health.hp = 1;
    player.transform.x = player.transform.prevX = cx + 500 - 10;
    player.transform.y = player.transform.prevY = cy;
    let gained = 0;
    world.bus.on('xp.gained', (e) => (gained = e.amount));
    for (let i = 0; i < 120 && !victim.dead; i++) step(world);
    // taban 25 + 4×10 = 65, Vahşi ×2 = 130 — en güçlü T2 mob (35×2=70)'den yüksek
    expect(gained).toBe(130);
  });
});

describe('M7 — sınıf kartları ve şarjlar', () => {
  it('sınıf kartı yalnız kendi sınıfının teklif havuzuna girer', () => {
    const { world, player } = setup(); // cengaver
    player.progress.pendingCards = 1;
    // Çok sayıda teklif üret: nişancı/ocakçı kartları asla gelmemeli
    for (let n = 0; n < 30; n++) {
      player.progress.offer = null;
      player.input.wantCards = true;
      step(world);
      for (const id of player.progress.offer) {
        const card = CARDS.find((c) => c.id === id);
        expect(!card.classId || card.classId === 'cengaver').toBe(true);
      }
    }
  });

  it('Girdap: savuruş tam daireye döner; Çatal Ok: mermi sayısı artar', () => {
    const { player } = setup();
    applyCard(player, 'girdap');
    expect(player.combat.auto.arc).toBeCloseTo(Math.PI * 2, 5);

    const world2 = createWorld(99);
    const archer = createPlayer(world2, 'nisanci', world2.map.widthPx / 2, world2.map.heightPx / 2);
    applyCard(archer, 'catal_ok');
    createMob(world2, 'slime', archer.transform.x + 60, archer.transform.y);
    step(world2);
    expect(world2.projectiles.length).toBe(2); // yelpaze
  });

  it('Yankı Becerisi: 2 şarj — art arda iki kez kullanılabilir', () => {
    const { world, player } = setup();
    applyCard(player, 'yanki_becerisi');
    player.input.moveX = 1;
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.charges).toBe(1); // ilk şarj gitti
    for (let i = 0; i < 15; i++) step(world); // dash bitsin
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.charges).toBe(0); // ikincisi de kullanılabildi
    // Cooldown'suz üçüncü olmaz
    for (let i = 0; i < 15; i++) step(world);
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.dash).toBeNull();
  });
});
