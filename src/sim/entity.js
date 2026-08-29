// Entity fabrikaları — bileşen kompozisyonu (ARCHITECTURE.md §4).

import { CLASSES } from '../data/classes.js';
import { MOBS, T2_MOBS, T3_MOBS, T4_MOB } from '../data/mobs.js';
import { RARITY, CARDS } from '../data/cards.js';
import { ZONE } from '../data/balance.js';
import { addEntity } from './world.js';

export function createPlayer(world, classId, x, y, opts = {}) {
  const cls = CLASSES[classId];
  const ent = {
    id: 0,
    kind: 'player',
    classId,
    transform: { x, y, prevX: x, prevY: y, dir: 'down' },
    motion: { velX: 0, velY: 0, speed: cls.speed },
    body: { radius: cls.radius, solid: true },
    health: { hp: cls.hp, maxHp: cls.hp, hurtT: 0 },
    combat: {
      team: 'player', // addEntity sonrası benzersizleşir: her oyuncu/bot ayrı takım (PvP)
      // Kartlar bu değerleri değiştirir — sınıf verisinin KOPYASI (paylaşım yasak)
      auto: { ...cls.auto },
      skill: { ...cls.skill },
      mods: { armor: 0, crit: 0, lifesteal: 0, regen: 0, killHeal: 0 },
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
    zone: { gzBudget: ZONE.GZ_BUDGET, exiled: false, wasInGZ: true }, // merkezde (GZ'de) doğar
    gather: {
      wood: 0,
      ore: 0,
      pots: 1, // maça 1 potla başlanır
      woodProcessed: 0,
      oreProcessed: 0,
      channel: null, // aktifken {type:'resource'|'focus', targetId?, t, duration}
      interrupt: false, // hasar yiyince combat bunu kaldırır → kanal bozulur
      drinkT: 0, // pot içme animasyonu: bu sürede yavaş
      potEffect: null, // aktifken {t, rate}
    },
    // Oyuncuda input/'tan, botta aiBotSystem'den dolar — sim için fark yok (§4)
    input: { moveX: 0, moveY: 0, wantSkill: false, wantCards: false, pickCard: -1, wantGather: false, wantPot: false },
    render: { sprite: opts.sprite ?? cls.sprite, animState: 'idle' },
  };
  addEntity(world, ent);
  ent.combat.team = 'p' + ent.id; // PvP: herkes kendi takımı
  ent.gatherBonus = cls.gatherBonus; // toplama uzmanlığı (PLAN §5)
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
    lockedBy: 0,
    loot: {
      wood: 2,
      ore: 2,
      cardId: epics[Math.floor(world.rng() * epics.length)].id,
    },
    render: { sprite: 'res_kese' },
  };
  addEntity(world, ent);
  world.resources.push(ent);
  world.bus.emit('kese.dropped', { x: ent.transform.x, y: ent.transform.y, elite: true });
  return ent;
}

/** Ganimet Kesesi (PLAN §9): ölen oyuncunun düşürdüğü, kanalla toplanan sandık. */
export function createLootBag(world, victim) {
  const t = victim.transform;
  const ent = {
    id: 0,
    kind: 'resource',
    resType: 'kese',
    transform: { x: t.x, y: t.y },
    body: { radius: 4, solid: false }, // üstünden yürünebilir, kanalla açılır
    lockedBy: 0,
    loot: {
      wood: victim.gather?.wood ?? 0,
      ore: victim.gather?.ore ?? 0,
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

/** Toplanabilir kaynak: ağaç (kereste), maden damarı (cevher), bitki (pot). */
export function createResource(world, resType, x, y) {
  const ent = {
    id: 0,
    kind: 'resource',
    resType,
    transform: { x, y },
    body: { radius: 4, solid: true },
    lockedBy: 0, // kanal kilidi: 0 = serbest (PLAN §7 — her kaynak tek kişiye)
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
