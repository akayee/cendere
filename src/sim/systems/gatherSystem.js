// Toplama: TEMASLA ANINDA (kanal/kilit YOK). Kaynaklar yerde duran pickup'lardır;
// üstüne gelen (gövde + kaynak yarıçapı teması) anında etkisini alır. Kanal
// altyapısı yalnız YOĞUNLAŞMA (can dolumu) için kalır; pot içme değişmedi.
// Ganimet Kesesi de temasla açılır — tek koşul: çatışmadan LOOT_DELAY sonra.

import { distSq } from '../../core/vec2.js';
import { ECON, SIM, COMBAT } from '../../data/balance.js';
import { CARDS } from '../../data/cards.js';
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

    // --- Yoğunlaşma kanalı: hasar VE hareket bozar
    const moving = ent.input.moveX !== 0 || ent.input.moveY !== 0;
    if (g.channel) {
      if (g.interrupt || moving || ent.combat?.dash) {
        breakFocus(world, ent, g.interrupt ? 'hasar' : 'hareket');
      } else {
        g.channel.t += SIM.DT;
        if (g.channel.t >= g.channel.duration) {
          if (canHeal(ent)) ent.health.hp = Math.min(ent.health.maxHp, ent.health.hp + ECON.FOCUS_HEAL * world.healMult);
          world.bus.emit('focus.tick', { x: ent.transform.x, y: ent.transform.y, amount: ECON.FOCUS_HEAL });
          if (ent.health.hp < ent.health.maxHp) g.channel.t = 0; // dolana kadar döngü sürer
          else g.channel = null;
        }
      }
    }
    g.interrupt = false;

    // --- Yoğunlaşma isteği (manuel): can eksikse başlat, açıksa iptal
    if (ent.input.wantGather) {
      ent.input.wantGather = false;
      if (g.channel) {
        breakFocus(world, ent, 'iptal');
      } else if (ent.health.hp < ent.health.maxHp) {
        g.channel = { type: 'focus', t: 0, duration: ECON.FOCUS_TICK };
        world.bus.emit('gather.started', { id: ent.id, resType: 'focus' });
      }
    }

    // --- TEMAS TOPLAMASI: üstüne gelinen pickup ANINDA işlenir (durmak/beklemek yok)
    collectTouching(world, ent);
  }
}

/** Bu entity şu an bu pickup'ı alabilir mi? (bot AI'ı da aynı kuralı kullanır) */
export function canPickup(ent, res) {
  if (res.resType === 'kese') {
    // Savaş bitiminden LOOT_DELAY sonra — çatışma ortasında kazara açılmasın
    const combatT = ent.combat?.inCombatT ?? 0;
    return combatT <= COMBAT.IN_COMBAT_TIME - COMBAT.LOOT_DELAY;
  }
  if (res.resType === 'herb') return ent.gather.pots < ECON.POT_MAX; // pot doluysa yerde kalır
  if (res.resType === 'speed') {
    return ent.gather.stats.speed * ECON.SPEED_PER_PICKUP < ECON.SPEED_PICKUP_CAP; // cap doluysa yerde kalır
  }
  return true; // atk / armor her zaman
}

function collectTouching(world, ent) {
  const t = ent.transform;
  for (let i = world.resources.length - 1; i >= 0; i--) {
    const res = world.resources[i];
    const reach = ent.body.radius + res.body.radius + ECON.PICKUP_PAD;
    if (distSq(t.x, t.y, res.transform.x, res.transform.y) > reach * reach) continue;
    if (!canPickup(ent, res)) continue;

    if (res.resType === 'kese') {
      openBag(world, ent, res);
    } else {
      applyPickup(world, ent, res.resType);
      world.bus.emit('gather.done', {
        id: ent.id,
        x: res.transform.x,
        y: res.transform.y,
        resType: res.resType,
      });
      world.respawnQueue.push({ resType: res.resType, x: res.transform.x, y: res.transform.y, t: ECON.RESPAWN_TIME });
    }
    removeResource(world, res);
  }
}

/** Pickup etkisi ANINDA işler; sınıf uzmanlığı kendi türünde ×2 etki alır (PLAN §5). */
function applyPickup(world, ent, resType) {
  const g = ent.gather;
  const mult = ent.pickupBonus === resType ? 2 : 1;

  if (resType === 'atk') {
    for (let i = 0; i < mult; i++) ent.combat.auto.damage *= ECON.ATK_DMG_MUL;
    g.stats.atk++;
  } else if (resType === 'armor') {
    ent.combat.mods.armor += ECON.ARMOR_PER_PICKUP * mult;
    g.stats.armor++;
  } else if (resType === 'herb') {
    g.pots = Math.min(ECON.POT_MAX, g.pots + mult);
  } else if (resType === 'speed') {
    ent.motion.speed = Math.min(
      ent.motion.speed * (1 + ECON.SPEED_PER_PICKUP),
      ent.motion.baseSpeed * ECON.SPEED_TOTAL_CAP // kartlarla üst üste binse de tavan
    );
    g.stats.speed++;
  }
}

/** Ganimet Kesesi: Yankı Kartı — açanın SINIFINA uygun kart, yoksa +20 XP (PLAN §9). */
function openBag(world, ent, res) {
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
  });
  if (cardId) {
    applyCard(ent, cardId);
    ent.progress.build.push(cardId);
  } else {
    ent.progress.xp += 20;
  }
  // kese yeniden doğmaz (respawnQueue'ya girmez)
}

function breakFocus(world, ent, reason) {
  const ch = ent.gather.channel;
  ent.gather.channel = null;
  world.bus.emit('gather.broken', { id: ent.id, reason, progress: ch.t });
}

function removeResource(world, res) {
  if (res.staticBody) world.staticHash.remove(res.staticBody);
  world.entities.delete(res.id);
  const idx = world.resources.indexOf(res);
  if (idx >= 0) world.resources.splice(idx, 1);
}
