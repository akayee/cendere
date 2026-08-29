// XP → seviye → kart döngüsü (PLAN.md §6).
// Seviye atlayınca: can FULLENİR + herkese görünür event. Kart ekranı ASLA
// kendiliğinden açılmaz: oyuncu wantCards intent'iyle ister, teklif kalıcıdır.

import { xpForLevel, XP } from '../../data/balance.js';
import { CARDS, RARITY } from '../../data/cards.js';

export function progressionSystem(world) {
  for (const ent of world.movers) {
    const p = ent.progress;
    if (!p || ent.dead) continue;

    // --- Seviye atlama (birden fazla olabilir)
    while (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level);
      p.level++;
      p.pendingCards++;
      ent.health.poison = null; // seviye atlamak zehri TEMİZLER (PLAN §9)...
      ent.health.hp = ent.health.maxHp; // ...sonra full can
      world.bus.emit('player.levelup', {
        id: ent.id,
        x: ent.transform.x,
        y: ent.transform.y,
        level: p.level,
        pendingCards: p.pendingCards,
      });
    }

    // --- Kart ekranı isteği
    if (ent.input.wantCards) {
      ent.input.wantCards = false;
      if (p.pendingCards > 0) {
        if (!p.offer) p.offer = rollOffer(world, ent);
        world.bus.emit('cards.offered', { id: ent.id, cards: p.offer });
      }
    }

    // --- Kart seçimi
    if (ent.input.pickCard >= 0) {
      const idx = ent.input.pickCard;
      ent.input.pickCard = -1;
      if (p.offer && idx < p.offer.length && p.pendingCards > 0) {
        const cardId = p.offer[idx];
        applyCard(ent, cardId);
        p.build.push(cardId);
        p.pendingCards--;
        p.offer = null;
        world.bus.emit('cards.picked', { id: ent.id, cardId, pendingCards: p.pendingCards });
      }
    }
  }
}

/** 3 kartlık teklif: nadirlik ağırlıklı, tekrarsız; sınıf kartları filtreli. */
function rollOffer(world, ent) {
  const offer = [];
  const pool = CARDS.filter((c) => !c.classId || c.classId === ent.classId);
  const totalW = (c) => RARITY[c.rarity].weight;
  for (let i = 0; i < XP.CARD_CHOICES && pool.length > 0; i++) {
    let sum = 0;
    for (const c of pool) sum += totalW(c);
    let roll = world.rng() * sum;
    let chosen = pool[pool.length - 1];
    for (const c of pool) {
      roll -= totalW(c);
      if (roll <= 0) {
        chosen = c;
        break;
      }
    }
    offer.push(chosen.id);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return offer;
}

/** Bildirimsel kart etkisini uygular (cards.js sözleşmesi). */
export function applyCard(ent, cardId) {
  const card = CARDS.find((c) => c.id === cardId);
  if (!card) return;
  const e = card.effect;
  const c = ent.combat;

  if (e.maxHpAdd) {
    ent.health.maxHp += e.maxHpAdd;
    ent.health.hp += e.maxHpAdd;
  }
  if (e.speedMul) ent.motion.speed *= e.speedMul;
  if (e.autoDamageAdd) c.auto.damage += e.autoDamageAdd;
  if (e.autoCooldownMul) c.auto.cooldown *= e.autoCooldownMul;
  if (e.autoRangeAdd) c.auto.range += e.autoRangeAdd;
  if (e.skillPowerMul) {
    // Beceri gücü: her sınıfın becerisine kendi diliyle işler
    if (c.skill.type === 'dash') c.skill.damage *= e.skillPowerMul;
    else if (c.skill.type === 'homingShot') c.skill.damageMul *= e.skillPowerMul;
    else if (c.skill.type === 'burnArea') c.skill.dps *= e.skillPowerMul;
  }
  if (e.skillCooldownMul) c.skill.cooldown *= e.skillCooldownMul;
  if (e.autoArcFull) c.auto.arc = Math.PI * 2; // Girdap: tam daire savuruş
  if (e.autoProjAdd) c.auto.projCount = (c.auto.projCount ?? 1) + e.autoProjAdd;
  if (e.poisonOnHit) c.mods.poisonOnHit = true;
  if (e.skillChargesSet) {
    c.maxCharges = e.skillChargesSet;
    c.charges = e.skillChargesSet; // alındığı an dolu gelir
  }
  if (e.armorAdd) c.mods.armor += e.armorAdd;
  if (e.critAdd) c.mods.crit += e.critAdd;
  if (e.lifestealAdd) c.mods.lifesteal += e.lifestealAdd;
  if (e.regenAdd) c.mods.regen += e.regenAdd;
  if (e.killHealAdd) c.mods.killHeal += e.killHealAdd;
}
