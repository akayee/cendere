// Savaş: otomatik saldırı, Atılma becerisi, mob temas hasarı, ölüm işaretleme.
// PvE ve PvP aynı hasar yolu — hedef filtresi takımdır (PLAN.md §9).

import { distSq } from '../../core/vec2.js';
import { COMBAT, SIM, XP, POISON } from '../../data/balance.js';

/** Zehirliyken HİÇBİR iyileşme işlemez (PLAN §9 — Ultima usulü). */
export function canHeal(ent) {
  return !(ent.health?.poison);
}

/** Zehir bulaştır: yığılmaz, süre tazelenir. */
export function applyPoison(world, target, dps, duration, sourceId) {
  if (!target.health || target.kind === 'dummy') return;
  const fresh = !target.health.poison;
  target.health.poison = { t: duration, dps, srcId: sourceId, acc: 0 };
  if (fresh) {
    world.bus.emit('poison.applied', { id: target.id, x: target.transform.x, y: target.transform.y });
  }
}

/**
 * Hedef alınabilir mi? Takım farklı olmalı — GZ kalktığı için PvP her yerde açık.
 */
export function canAttack(world, attacker, target) {
  if (target.dead || !target.combat) return false;
  if (target.combat.team === attacker.combat.team) return false;
  return true;
}

const DIR_VEC = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

export function combatSystem(world) {
  for (const ent of world.movers) {
    const c = ent.combat;
    if (!c) continue;

    // --- Zamanlayıcılar
    if (ent.health.hurtT > 0) ent.health.hurtT -= SIM.DT;
    if (c.autoCd > 0) c.autoCd -= SIM.DT;
    if (c.skillCd > 0) c.skillCd -= SIM.DT;
    if (c.swingT > 0) c.swingT -= SIM.DT;
    if (c.attackCd > 0) c.attackCd -= SIM.DT;

    // --- Zehir: sn'de bir DoT; süresi dolunca geçer (öldürebilir — kill kredisi kaynağa)
    const poison = ent.health.poison;
    if (poison && !ent.dead) {
      poison.t -= SIM.DT;
      poison.acc += SIM.DT;
      if (poison.acc >= POISON.TICK) {
        poison.acc -= POISON.TICK;
        ent.health.hp -= poison.dps;
        ent.health.hurtT = COMBAT.HURT_TIME; // zehir tick'i de hasar flaşı üretsin (render okur)
        world.bus.emit('poison.tick', { id: ent.id, x: ent.transform.x, y: ent.transform.y, amount: poison.dps });
        if (ent.health.hp <= 0) {
          ent.dead = true;
          ent.lastHitBy = poison.srcId ?? 0;
        }
      }
      if (poison.t <= 0) {
        ent.health.poison = null;
        world.bus.emit('poison.cured', { id: ent.id });
      }
    }

    // --- Pasif can yenileme (kartlardan; Ani Ölüm'de yarım; zehirliyken KAPALI)
    if (c.mods?.regen > 0 && ent.health.hp < ent.health.maxHp && !ent.dead && canHeal(ent)) {
      ent.health.hp = Math.min(ent.health.maxHp, ent.health.hp + c.mods.regen * world.healMult * SIM.DT);
    }

    // --- Kırık kukla onarımı: bekleme süresi dolunca full canla geri gelir
    if (ent.health.brokenT > 0) {
      ent.health.brokenT -= SIM.DT;
      if (ent.health.brokenT <= 0) {
        ent.health.hp = ent.health.maxHp;
        world.bus.emit('dummy.repaired', { x: ent.transform.x, y: ent.transform.y });
      }
    }

    if (ent.dead) continue;

    if (c.buffAtkT > 0) c.buffAtkT -= SIM.DT;
    if (c.inCombatT > 0) c.inCombatT -= SIM.DT; // savaş hali: oto-toplama bekler
    if (c.stunT > 0) {
      c.stunT -= SIM.DT;
      continue; // sersemlemişken saldırı/beceri yok (hareket de movementSystem'de kilitli)
    }

    if (ent.kind === 'player') {
      updateDash(world, ent);
      tryStartSkill(world, ent);
      tryAutoAttack(world, ent);
    } else if (c.team === 'mob') {
      tryTouchAttack(world, ent);
    }
  }
}

// --- Beceriler ---------------------------------------------------------

function tryStartSkill(world, ent) {
  const c = ent.combat;

  // Yankı Becerisi (şarj sistemi): cooldown dolunca şarj birikir
  const maxCharges = c.maxCharges ?? 1;
  c.charges ??= maxCharges;
  if (c.charges < maxCharges && c.skillCd <= 0) {
    c.charges++;
    if (c.charges < maxCharges) c.skillCd = c.skill.cooldown;
  }

  if (!ent.input.wantSkill) return;
  ent.input.wantSkill = false;
  if (c.charges <= 0 || c.dash) return;

  // Yön: hareket girdisi varsa o, yoksa bakılan yön
  let dx = ent.input.moveX;
  let dy = ent.input.moveY;
  if (dx === 0 && dy === 0) [dx, dy] = DIR_VEC[ent.transform.dir];
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;

  const s = c.skill;
  if (s.type === 'dash') {
    // Rakibe atlama: leapRange içindeki en yakın CANLI rakip (oyuncu/bot — MOB DEĞİL)
    // varsa atılma onun O ANKİ konumuna kilitlenir: tek atılım, sürekli takip yok.
    // Mesafe tavanı mevcut atılma mesafesidir — süre kısalabilir, asla uzamaz.
    const foe = s.leapRange ? nearestFoePlayer(world, ent, s.leapRange) : null;
    let dur = s.duration;
    if (foe) {
      const fx = foe.transform.x - ent.transform.x;
      const fy = foe.transform.y - ent.transform.y;
      const fd = Math.hypot(fx, fy) || 1;
      dx = fx / fd;
      dy = fy / fd;
      const dashSpeed = ent.motion.speed * s.speedMul;
      // En az 2 tick: bitişik rakipte de çarpma kontrolü çalışsın
      dur = Math.min(s.duration, Math.max(SIM.DT * 2, fd / dashSpeed));
    }
    c.dash = { t: dur, dirX: dx, dirY: dy, hitIds: [] };
  } else if (s.type === 'homingShot') {
    // Şaşmaz Ok: menzilde hedef YOKSA harcanmaz (uzun cooldown boşa yanmasın)
    const target = nearestTarget(world, ent, c.auto.range * s.seekRange);
    if (!target) {
      world.bus.emit('skill.noTarget', { id: ent.id });
      return; // cooldown başlamaz
    }
    const speed = c.auto.projSpeed * s.projSpeedMul;
    world.projectiles.push({
      x: ent.transform.x,
      y: ent.transform.y - 6,
      vx: 0,
      vy: 0,
      speed,
      damage: c.auto.damage * s.damageMul,
      team: c.team,
      ownerId: ent.id,
      targetId: target.id,
      homing: true, // hedefi takip eder: engel durdurmaz, KAÇIRMAZ
      ttl: 3,
      kind: 'homingArrow',
    });
    c.swingT = c.auto.swingTime;
  } else if (s.type === 'burnArea') {
    // Alev HEDEFE fırlatılır: dalan yakın dövüşçünün de, kite atan okçunun da
    // ayağının altı yanar. Menzilde hedef yoksa kendi konumuna bırakılır.
    const target = nearestTarget(world, ent, c.auto.range * (s.throwRange ?? 1));
    const px = target ? target.transform.x : ent.transform.x;
    const py = target ? target.transform.y : ent.transform.y;
    // Toplam hasar bütçesi (dps × süre) sabit kalır: %AREA_BURST_RATIO'su atıldığı AN
    // alandakilere iner, kalanı alanda kalındıkça DoT olarak işler.
    const burst = s.dps * s.areaDuration * COMBAT.AREA_BURST_RATIO;
    world.areas.push({
      x: px,
      y: py,
      r: s.radius,
      dps: s.dps * (1 - COMBAT.AREA_BURST_RATIO),
      team: c.team,
      ownerId: ent.id,
      ttl: s.areaDuration,
      tickAcc: 0,
    });
    for (const other of world.movers) {
      if (other === ent || !canAttack(world, ent, other)) continue;
      if (distSq(px, py, other.transform.x, other.transform.y) < s.radius * s.radius) {
        applyDamage(world, other, burst, ent);
      }
    }
    world.bus.emit('area.spawned', { id: ent.id, x: px, y: py, r: s.radius });
  }
  c.charges--;
  c.skillCd = s.cooldown;
}

function updateDash(world, ent) {
  const c = ent.combat;
  if (!c.dash) return;
  c.dash.t -= SIM.DT;
  if (c.dash.t <= 0) {
    c.dash = null;
    return;
  }
  // Atılma yolundaki düşmanlara bir kez hasar (backstep hasarsızdır)
  if (!c.skill.damage) return;
  for (const other of world.movers) {
    if (other === ent || !canAttack(world, ent, other)) continue;
    if (c.dash.hitIds.includes(other.id)) continue;
    const rr = ent.body.radius + other.body.radius + 3;
    if (distSq(ent.transform.x, ent.transform.y, other.transform.x, other.transform.y) < rr * rr) {
      c.dash.hitIds.push(other.id);
      applyDamage(world, other, c.skill.damage, ent);
    }
  }
}

/** Menzildeki en yakın CANLI rakip oyuncu/bot — moblar ve kuklalar SEÇİLMEZ. */
function nearestFoePlayer(world, ent, radius) {
  let best = null;
  let bestDsq = radius * radius;
  for (const other of world.movers) {
    if (other === ent || other.kind !== 'player' || !canAttack(world, ent, other)) continue;
    const dsq = distSq(ent.transform.x, ent.transform.y, other.transform.x, other.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = other;
    }
  }
  return best;
}

/** Menzildeki en yakın saldırılabilir hedef */
function nearestTarget(world, ent, radius) {
  let best = null;
  let bestDsq = radius * radius;
  for (const other of world.movers) {
    if (other === ent || !canAttack(world, ent, other)) continue;
    const dsq = distSq(ent.transform.x, ent.transform.y, other.transform.x, other.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = other;
    }
  }
  return best;
}

// --- Otomatik saldırı --------------------------------------------------

function tryAutoAttack(world, ent) {
  const c = ent.combat;
  if (c.autoCd > 0) return;

  const t = ent.transform;
  const range = c.auto.range;

  // En yakın hedef (menzil içinde, GZ filtresiyle)
  let nearest = null;
  let nearestDsq = range * range;
  for (const other of world.movers) {
    if (other === ent || !canAttack(world, ent, other)) continue;
    const dsq = distSq(t.x, t.y, other.transform.x, other.transform.y);
    if (dsq < nearestDsq) {
      nearestDsq = dsq;
      nearest = other;
    }
  }
  if (!nearest) return;

  // Hedefe dön (auto-aim) — 4 yönlü sprite için baskın eksen
  const fx = nearest.transform.x - t.x;
  const fy = nearest.transform.y - t.y;
  if (Math.abs(fx) >= Math.abs(fy)) t.dir = fx < 0 ? 'left' : 'right';
  else t.dir = fy < 0 ? 'up' : 'down';
  const facing = Math.atan2(fy, fx);

  if (c.auto.type === 'projectile') {
    // Menzilli: hedefe doğru mermi(ler) — Çatal Ok/Çifte Kor yelpaze halinde atar
    const count = c.auto.projCount ?? 1;
    const spread = 0.16; // yelpaze açıklığı (radyan)
    world.bus.emit('auto.fired', { id: ent.id, kind: ent.classId === 'ocakci' ? 'bolt' : 'arrow' });
    for (let i = 0; i < count; i++) {
      const off = count > 1 ? (i - (count - 1) / 2) * spread : 0;
      const a = facing + off;
      world.projectiles.push({
        x: t.x,
        y: t.y - 6,
        vx: Math.cos(a) * c.auto.projSpeed,
        vy: Math.sin(a) * c.auto.projSpeed,
        damage: c.auto.damage,
        team: c.team,
        ownerId: ent.id,
        ttl: (range + 14) / c.auto.projSpeed,
        kind: ent.classId === 'ocakci' ? 'bolt' : 'arrow',
      });
    }
  } else {
    // Yakın dövüş: yay içindeki TÜM hedeflere hasar
    const halfArc = c.auto.arc / 2;
    for (const other of world.movers) {
      if (other === ent || !canAttack(world, ent, other)) continue;
      const dx = other.transform.x - t.x;
      const dy = other.transform.y - t.y;
      if (dx * dx + dy * dy > range * range) continue;
      let diff = Math.atan2(dy, dx) - facing;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) <= halfArc) applyDamage(world, other, c.auto.damage, ent);
    }
    world.bus.emit('player.attack', { id: ent.id, x: t.x, y: t.y, angle: facing });
  }

  const atkMul = c.buffAtkT > 0 ? (c.skill.atkSpeedMul ?? 1) : 1;
  c.autoCd = c.auto.cooldown * atkMul;
  c.swingT = c.auto.swingTime;
}

// --- Mob temas saldırısı ----------------------------------------------

function tryTouchAttack(world, ent) {
  const c = ent.combat;
  const target = ent.ai && world.entities.get(ent.ai.targetId);
  if (!target || target.dead || c.attackCd > 0) return;
  const rr = ent.body.radius + target.body.radius + COMBAT.TOUCH_PAD;
  if (distSq(ent.transform.x, ent.transform.y, target.transform.x, target.transform.y) < rr * rr) {
    applyDamage(world, target, c.touchDamage, ent);
    // Zehirli mob (örümcek): vuruşu zehir bulaştırır
    const p = ent.ai.def.poison;
    if (p) applyPoison(world, target, p.dps, p.duration, ent.id);
    c.attackCd = ent.ai.def.attackCooldown;
  }
}

// --- Hasar -------------------------------------------------------------

export function applyDamage(world, target, amount, source) {
  // Kırık kukla vurulamaz: hasar da XP de yok (onarımı bekle)
  if (target.kind === 'dummy' && target.health.brokenT > 0) return;

  const srcMods = source.combat?.mods;
  const tgtMods = target.combat?.mods;

  // Kritik (kaynak) ve zırh (hedef) — kartlardan gelen modlar
  let crit = false;
  if (srcMods?.crit > 0 && world.rng() < srcMods.crit) {
    amount = Math.round(amount * 1.5);
    crit = true;
  }
  if (amount <= 0) return; // sıfır hasarlı vuruş yok sayılır
  // Zırh hasarı düşürür ama en fazla %70: vuruş, ham hasarın MIN_DAMAGE_RATIO'sundan
  // aşağı İNEMEZ. (Eski düz max(1,...) tabanı, zırh istifinde her vuruşu 1'e çakıyordu.)
  if (tgtMods?.armor > 0) {
    amount = Math.max(amount * COMBAT.MIN_DAMAGE_RATIO, amount - tgtMods.armor);
  }
  // Uygulanan hasar her zaman düz tam sayıdır (stat'lar ondalıklı olabilir — ×1.02 vb.);
  // mutlak taban yine 1'dir
  amount = Math.max(1, Math.round(amount));

  target.health.hp -= amount;
  target.health.hurtT = COMBAT.HURT_TIME;
  if (target.gather) target.gather.interrupt = true; // hasar kanalı bozar (PLAN §7)
  target.lastHitBy = source.id ?? 0; // kill feed: son vuran
  // İki taraf da "savaşta" sayılır: dövüş bitmeden oto-toplama başlamaz
  if (target.combat) target.combat.inCombatT = COMBAT.IN_COMBAT_TIME;
  if (source.combat) source.combat.inCombatT = COMBAT.IN_COMBAT_TIME;

  // Can çalma (Ani Ölüm'de yarım; zehirliyken kapalı)
  if (srcMods?.lifesteal > 0 && source.health && canHeal(source)) {
    source.health.hp = Math.min(source.health.maxHp, source.health.hp + amount * srcMods.lifesteal * world.healMult);
  }

  // Zehirli Kenar kartı: saldırılar zehir bulaştırır
  if (srcMods?.poisonOnHit) {
    applyPoison(world, target, POISON.CARD_DPS, POISON.CARD_DURATION, source.id);
  }

  // Geri itme: kaynaktan uzağa (kuklalar yerinden oynamaz)
  if (target.kind !== 'dummy') {
    const dx = target.transform.x - source.transform.x;
    const dy = target.transform.y - source.transform.y;
    const len = Math.hypot(dx, dy) || 1;
    target.transform.x += (dx / len) * COMBAT.KNOCKBACK;
    target.transform.y += (dy / len) * COMBAT.KNOCKBACK;
  }

  // Pasif mob vurulunca saldırgana kilitlenir
  if (target.ai) {
    target.ai.targetId = source.id;
    target.ai.state = 'chase';
  }

  world.bus.emit('damage.dealt', {
    x: target.transform.x,
    y: target.transform.y,
    amount,
    crit,
    targetKind: target.kind,
    targetId: target.id,
  });

  // Kukla: vuruş başına XP; "ölünce" kırılır ve onarım süresi bekler (anında yenilenmez)
  if (target.kind === 'dummy') {
    if (source.progress) {
      source.progress.xp += XP.DUMMY_PER_HIT;
      world.bus.emit('xp.gained', { x: source.transform.x, y: source.transform.y, amount: XP.DUMMY_PER_HIT });
    }
    if (target.health.hp <= 0) {
      target.health.hp = 0;
      target.health.brokenT = COMBAT.DUMMY_REPAIR_TIME;
      world.bus.emit('dummy.broken', { x: target.transform.x, y: target.transform.y });
    }
    return;
  }

  if (target.health.hp <= 0) {
    target.dead = true;
    // Kill ödülleri: XP (bölge çarpanı YOK — taban değerler buna göre yükseltildi)
    // + kill başına can (kartlardan). Oyuncu kesmek her mobdan değerlidir (PLAN §6).
    if (source.progress) {
      let gained = 0;
      if (target.ai?.def.xp) gained = target.ai.def.xp;
      else if (target.kind === 'player') gained = XP.PVP_BASE + target.progress.level * XP.PVP_PER_LEVEL;
      if (gained > 0) {
        source.progress.xp += gained;
        world.bus.emit('xp.gained', { x: source.transform.x, y: source.transform.y, amount: gained });
      }
    }
    if (srcMods?.killHeal > 0 && source.health && canHeal(source)) {
      source.health.hp = Math.min(source.health.maxHp, source.health.hp + srcMods.killHeal);
    }
  }
}
