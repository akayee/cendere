// Entity fabrikaları — bileşen kompozisyonu (ARCHITECTURE.md §4).

import { CLASSES } from '../data/classes.js';
import { ECON } from '../data/balance.js';
import { MOBS, T2_MOBS, T3_MOBS, T4_MOB } from '../data/mobs.js';
import { RARITY, CARDS } from '../data/cards.js';
import { addEntity } from './world.js';

export function createPlayer(world, classId, x, y, opts = {}) {
  const cls = CLASSES[classId];
  const ent = {
    id: 0,
    kind: 'player',
    classId,
    transform: { x, y, prevX: x, prevY: y, dir: 'down' },
    motion: { velX: 0, velY: 0, speed: cls.speed, baseSpeed: cls.speed }, // baseSpeed: hız tavanı referansı
    body: { radius: cls.radius, solid: true },
    health: { hp: cls.hp, maxHp: cls.hp, hurtT: 0, killHpGain: 0 }, // killHpGain: Avcı İçgüdüsü birikimi (KILL_MAXHP_CAP'te durur)
    combat: {
      team: 'player', // addEntity sonrası benzersizleşir: her oyuncu/bot ayrı takım (PvP)
      // Kartlar bu değerleri değiştirir — sınıf verisinin KOPYASI (paylaşım yasak)
      auto: { ...cls.auto },
      skill: { ...cls.skill },
      mods: { armor: 0, crit: 0, lifesteal: 0, regen: 0, killMaxHp: 0 },
      autoCd: 0,
      skillCd: 0,
      swingT: 0,
      dash: null, // aktifken {t, dirX, dirY, hitIds}
    },
    progress: {
      level: 1,
      xp: 0,
      pendingCards: 0, // bekleyen kart seçim hakkı (birikir — PLAN §6)
      offer: null, // açık teklif: kart id dizisi (tekrar açınca aynı 3 kart)
      build: [], // seçilen kart id'leri
    },
    gather: {
      stats: { atk: 0, armor: 0, speed: 0, herb: 0 }, // ömürlük pickup sayaçları (HUD + eşik ödülleri)
      milestones: { atk: 0, armor: 0, speed: 0 }, // ulaşılan eşik KADEMESİ (0..MILESTONE_TIERS; her kademe bir kez)
      armorFromPickups: 0, // pickup kaynaklı zırh toplamı (ARMOR_PICKUP_CAP'te durur; kart/eşik zırhı dahil değil)
      potMax: ECON.POT_MAX, // güncel pot kapasitesi (POT_UPGRADE_AT bitkide POT_MAX_UPGRADED olur)
      pots: 1, // maça 1 potla başlanır
      channel: null, // aktifken {type:'focus', t, duration} — kanal artık YALNIZ yoğunlaşma için
      interrupt: false, // hasar yiyince combat bunu kaldırır → kanal bozulur
      drinkT: 0, // pot içme animasyonu: bu sürede yavaş
      potEffect: null, // aktifken {t, rate}
    },
    // Oyuncuda input/'tan, botta aiBotSystem'den dolar — sim için fark yok (§4)
    input: { moveX: 0, moveY: 0, wantSkill: false, wantCards: false, pickCard: -1, wantGather: false, wantPot: false },
    // auras: eşik ödülü etiketleri ({type:'atk'|'armor'|'speed', tier:1..4}) — sim YAZAR ama YORUMLAMAZ (§8b/9)
    render: { sprite: opts.sprite ?? cls.sprite, animState: 'idle', auras: [] },
  };
  addEntity(world, ent);
  ent.combat.team = 'p' + ent.id; // PvP: herkes kendi takımı
  ent.pickupBonus = cls.pickupBonus; // uzmanlık: kendi türünde pickup etkisi ×2 (PLAN §5)
  ent.name = opts.name ?? 'Sen';
  if (opts.bot) {
    // "Sanal parmak": bot AI'ı input bileşenini doldurur (ARCHITECTURE.md §4)
    ent.botAi = {
      personality: opts.personality, // {aggro, greed}
      thinkT: 0,
      goalX: x,
      goalY: y,
      fleeing: 0,
    };
  } else {
    world.playerId = ent.id;
  }
  return ent;
}

/** Elit ganimeti (PLAN §8): T3 kesesi — Destansı kart GARANTİLİ. */
export function createEliteBag(world, mob) {
  const epics = CARDS.filter((c) => c.rarity === RARITY.epic.key && !c.classId);
  const ent = {
    id: 0,
    kind: 'resource',
    resType: 'kese',
    transform: { x: mob.transform.x, y: mob.transform.y },
    body: { radius: 4, solid: false },
    loot: {
      cardId: epics[Math.floor(world.rng() * epics.length)].id,
    },
    render: { sprite: 'res_kese' },
  };
  addEntity(world, ent);
  world.resources.push(ent);
  world.bus.emit('kese.dropped', { x: ent.transform.x, y: ent.transform.y, elite: true });
  return ent;
}

/** Ganimet Kesesi (PLAN §9): ölen oyuncunun düşürdüğü, TEMASLA açılan sandık
 *  (tek koşul: çatışmadan LOOT_DELAY sonra — savaşın ortasında kazara açılmaz). */
export function createLootBag(world, victim) {
  const t = victim.transform;
  const ent = {
    id: 0,
    kind: 'resource',
    resType: 'kese',
    transform: { x: t.x, y: t.y },
    body: { radius: 4, solid: false }, // üstünden yürünerek açılır
    loot: {
      cardId: null, // Yankı Kartı açılış anında, AÇANIN sınıfına uygun seçilir
      build: [...(victim.progress?.build ?? [])],
    },
    render: { sprite: 'res_kese' },
  };
  addEntity(world, ent);
  world.resources.push(ent);
  world.bus.emit('kese.dropped', { x: t.x, y: t.y });
  return ent;
}

/** Yerde duran pickup: atk (saldırı), armor (zırh), herb (pot), speed (hız). */
export function createResource(world, resType, x, y) {
  const ent = {
    id: 0,
    kind: 'resource',
    resType,
    transform: { x, y },
    body: { radius: 4, solid: true },
    render: { sprite: 'res_' + resType },
  };
  addEntity(world, ent);
  world.resources.push(ent);
  // Katı gövde: statik hash'e kaydet (hasadında kaldırılır)
  ent.staticBody = { shape: 'circle', type: 'resource', x, y, r: 4 };
  world.staticHash.insert(ent.staticBody, x - 4, y - 4, x + 4, y + 4);
  return ent;
}

/** Antrenman kuklası: hareketsiz, ölmez ("ölünce" full canla sıfırlanır), az XP verir. */
export function createDummy(world, x, y) {
  const ent = {
    id: 0,
    kind: 'dummy',
    transform: { x, y, prevX: x, prevY: y, dir: 'down' },
    motion: { velX: 0, velY: 0, speed: 0 }, // movers listesine girsin diye (hedeflenebilir)
    body: { radius: 5, solid: true },
    health: { hp: 40, maxHp: 40, hurtT: 0, brokenT: 0 },
    combat: { team: 'dummy' }, // saldırmaz; sadece hedef
    input: { moveX: 0, moveY: 0, wantSkill: false },
    render: { sprite: 'dummy', animState: 'idle' },
  };
  addEntity(world, ent);
  return ent;
}

export function createMob(world, mobId, x, y) {
  const def = MOBS[mobId] ?? T2_MOBS[mobId] ?? T3_MOBS[mobId] ?? (T4_MOB.id === mobId ? T4_MOB : null);
  const ent = {
    id: 0,
    kind: 'mob',
    mobId,
    transform: { x, y, prevX: x, prevY: y, dir: 'down' },
    motion: { velX: 0, velY: 0, speed: def.speed },
    body: { radius: def.radius, solid: true },
    health: { hp: def.hp, maxHp: def.hp, hurtT: 0 },
    combat: { team: 'mob', touchDamage: def.damage, attackCd: 0 },
    input: { moveX: 0, moveY: 0, wantSkill: false },
    ai: {
      def,
      state: 'idle', // idle | chase | return
      homeX: x,
      homeY: y,
      targetId: 0,
      wanderT: 0,
      wanderX: x,
      wanderY: y,
    },
    render: { sprite: def.sprite, animState: 'idle' },
  };
  addEntity(world, ent);
  return ent;
}
