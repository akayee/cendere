// Kanal + kilit sistemi (PLAN §7): BİR mekanik, üç özellik —
// kaynak toplama, yoğunlaşma (can dolumu), pot etkisi. Ganimet Kesesi de (M6)
// aynı kapıdan girecek. Kanalı hasar VE hareket bozar; kilit tek kişiliktir.

import { distSq } from '../../core/vec2.js';
import { ECON, SIM, COMBAT } from '../../data/balance.js';
import { CARDS } from '../../data/cards.js';
import { yieldMultiplier } from '../zone.js';
import { createResource } from '../entity.js';
import { applyCard } from './progressionSystem.js';
import { canHeal } from './combatSystem.js';

export function gatherSystem(world) {
  // --- Kaynak yeniden doğumu
  for (let i = world.respawnQueue.length - 1; i >= 0; i--) {
    const q = world.respawnQueue[i];
    q.t -= SIM.DT;
    if (q.t <= 0) {
      createResource(world, q.resType, q.x, q.y);
      world.respawnQueue.splice(i, 1);
    }
  }

  for (const ent of world.movers) {
    const g = ent.gather;
    if (!g || ent.dead) continue;

    // --- Pot etkisi: zamana yayılı can (Ani Ölüm'de yarım; zehirliyken işlemez)
    if (g.potEffect) {
      g.potEffect.t -= SIM.DT;
      if (canHeal(ent)) {
        ent.health.hp = Math.min(ent.health.maxHp, ent.health.hp + g.potEffect.rate * world.healMult * SIM.DT);
      }
      if (g.potEffect.t <= 0) g.potEffect = null;
    }
    if (g.drinkT > 0) g.drinkT -= SIM.DT;

    // --- Pot içme isteği (pot aynı zamanda PANZEHİRDİR: zehri temizler — PLAN §9 sade hali)
    if (ent.input.wantPot) {
      ent.input.wantPot = false;
      if (g.pots > 0 && !g.potEffect) {
        g.pots--;
        g.drinkT = ECON.POT_DRINK_TIME;
        g.potEffect = { t: ECON.POT_DURATION, rate: ECON.POT_HEAL_RATE };
        if (ent.health.poison) {
          ent.health.poison = null;
          world.bus.emit('poison.cured', { id: ent.id });
        }
        world.bus.emit('pot.used', { id: ent.id, x: ent.transform.x, y: ent.transform.y, left: g.pots });
      }
    }

    // --- Aktif kanal
    const moving = ent.input.moveX !== 0 || ent.input.moveY !== 0;
    if (g.channel) {
      if (g.interrupt || moving || ent.combat?.dash) {
        breakChannel(world, ent, g.interrupt ? 'hasar' : 'hareket');
      } else {
        g.channel.t += SIM.DT;
        if (g.channel.t >= g.channel.duration) completeChannel(world, ent);
      }
    }
    g.interrupt = false;

    // --- OTOMATİK toplama: dururken menzilde serbest kaynak varsa kanal kendiliğinden
    // başlar. Savaş halindeyken normal kaynaklar BEKLER (3 sn) ama Ganimet Kesesi
    // kill'den 0.5 sn sonra açılabilir — loot temposu düşmesin.
    if (!g.channel && !moving && !ent.combat?.dash) {
      const best = nearestFreeResource(world, ent);
      const combatT = ent.combat?.inCombatT ?? 0;
      const allowed =
        best &&
        (best.resType === 'kese'
          ? combatT <= COMBAT.IN_COMBAT_TIME - COMBAT.LOOT_DELAY
          : combatT <= 0);
      if (allowed) {
        best.lockedBy = ent.id; // KİLİT: bu kaynak artık başkasına kapalı
        // Kese hızlı açılır; sınıf uzmanlığı kendi kaynağını 2 kat hızlı toplar (PLAN §5)
        let duration = best.resType === 'kese' ? ECON.KESE_TIME : ECON.GATHER_TIME;
        if (ent.gatherBonus && ent.gatherBonus === best.resType) duration /= 2;
        g.channel = { type: 'resource', targetId: best.id, t: 0, duration };
        world.bus.emit('gather.started', { id: ent.id, resType: best.resType });
      }
    }

    // --- Yoğunlaşma isteği (manuel kalır): kaynak kanalı yoksa ve can eksikse
    if (ent.input.wantGather) {
      ent.input.wantGather = false;
      if (g.channel?.type === 'focus') {
        breakChannel(world, ent, 'iptal');
      } else if (!g.channel && ent.health.hp < ent.health.maxHp) {
        g.channel = { type: 'focus', t: 0, duration: ECON.FOCUS_TICK };
        world.bus.emit('gather.started', { id: ent.id, resType: 'focus' });
      }
    }
  }
}

/** Menzildeki en yakın serbest kaynak (pot doluysa bitki atlanır — israf yok). */
export function nearestFreeResource(world, ent, reachOverride) {
  const t = ent.transform;
  const reach = reachOverride ?? ECON.GATHER_RANGE + ent.body.radius;
  let best = null;
  let bestDsq = reach * reach;
  for (const res of world.resources) {
    if (res.lockedBy) continue;
    if (res.resType === 'herb' && ent.gather.pots >= ECON.POT_MAX) continue;
    const dsq = distSq(t.x, t.y, res.transform.x, res.transform.y);
    if (dsq < bestDsq) {
      best = res;
      bestDsq = dsq;
    }
  }
  return best;
}

function completeChannel(world, ent) {
  const g = ent.gather;
  const ch = g.channel;

  if (ch.type === 'focus') {
    if (canHeal(ent)) ent.health.hp = Math.min(ent.health.maxHp, ent.health.hp + ECON.FOCUS_HEAL * world.healMult);
    world.bus.emit('focus.tick', { x: ent.transform.x, y: ent.transform.y, amount: ECON.FOCUS_HEAL });
    if (ent.health.hp < ent.health.maxHp) {
      ch.t = 0; // dolana kadar döngü sürer
    } else {
      g.channel = null;
    }
    return;
  }

  // Kaynak hasadı
  const res = world.entities.get(ch.targetId);
  g.channel = null;
  if (!res) return;

  // Ganimet Kesesi: malzemeler + Yankı Kartı (PLAN §9)
  // Yankı Kartı AÇILIŞ anında, açan kişinin SINIFINA uygun kartlardan seçilir —
  // Cengâver'e Çatal Ok gitmez; uygun kart yoksa XP'ye dönüşür.
  if (res.resType === 'kese') {
    g.wood += res.loot.wood;
    g.ore += res.loot.ore;
    let cardId = res.loot.cardId ?? null; // elit kesede sabit Destansı
    if (!cardId && res.loot.build?.length) {
      const uygun = res.loot.build.filter((id) => {
        const c = CARDS.find((k) => k.id === id);
        return c && (!c.classId || c.classId === ent.classId);
      });
      if (uygun.length) cardId = uygun[Math.floor(world.rng() * uygun.length)];
    }
    world.bus.emit('kese.opened', {
      x: res.transform.x,
      y: res.transform.y,
      id: ent.id,
      cardId,
      wood: res.loot.wood,
      ore: res.loot.ore,
    });
    if (cardId) {
      applyCard(ent, cardId);
      ent.progress.build.push(cardId);
    } else {
      ent.progress.xp += 20;
    }
    processMaterials(world, ent);
    removeResource(world, res); // kese yeniden doğmaz
    return;
  }

  const amount = yieldMultiplier(world, ent); // kendi GZ'nde ×1, dışarıda ×2
  if (res.resType === 'herb') {
    g.pots = Math.min(ECON.POT_MAX, g.pots + amount);
  } else if (res.resType === 'wood') {
    g.wood += amount;
  } else {
    g.ore += amount;
  }
  world.bus.emit('gather.done', {
    id: ent.id,
    x: res.transform.x,
    y: res.transform.y,
    resType: res.resType,
    amount,
  });

  processMaterials(world, ent);
  removeResource(world, res);
  world.respawnQueue.push({ resType: res.resType, x: res.transform.x, y: res.transform.y, t: ECON.RESPAWN_TIME });
}

/** Otomatik işleme (PLAN §7): envanter ekranı yok — malzeme kendiliğinden stata dönüşür. */
function processMaterials(world, ent) {
  const g = ent.gather;
  while (g.ore - g.oreProcessed * ECON.ORE_PER_ARMOR >= ECON.ORE_PER_ARMOR) {
    g.oreProcessed++;
    ent.combat.mods.armor += 1;
    world.bus.emit('material.processed', { id: ent.id, x: ent.transform.x, y: ent.transform.y, text: 'ZIRH +1' });
  }
  while (g.wood - g.woodProcessed * ECON.WOOD_PER_DMG >= ECON.WOOD_PER_DMG) {
    g.woodProcessed++;
    ent.combat.auto.damage *= ECON.WOOD_DMG_MUL;
    world.bus.emit('material.processed', { id: ent.id, x: ent.transform.x, y: ent.transform.y, text: 'SALDIRI +%2' });
  }
}

function breakChannel(world, ent, reason) {
  const g = ent.gather;
  const ch = g.channel;
  g.channel = null;
  if (ch.type === 'resource') {
    const res = world.entities.get(ch.targetId);
    if (res && res.lockedBy === ent.id) res.lockedBy = 0; // kilit düşer — kaynak gaspa açık
  }
  world.bus.emit('gather.broken', { id: ent.id, reason, progress: ch.t });
}

function removeResource(world, res) {
  world.staticHash.remove(res.staticBody);
  world.entities.delete(res.id);
  const idx = world.resources.indexOf(res);
  if (idx >= 0) world.resources.splice(idx, 1);
}
