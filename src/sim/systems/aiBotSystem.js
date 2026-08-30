// Bot AI (PLAN §10): oyuncu gibi Intent üretir — sim'in gözünde fark yok (§4).
// Utility yaklaşımı: yarım saniyede bir durum değerlendirir, hedef seçer.
// Toplama TEMASLA olduğu için botun işi yalnız POZİSYON almaktır: kaynağın
// üstünden geçmek yeter, durup kanallamaz. Canı azalınca savaştan kaçar ve
// güvenliyse yoğunlaşma/pot kullanır (GZ'ye çekilme kalktı).
//
// Yol bulma yoktur; onun yerine iki sigorta vardır:
//  - Takılma dedektörü: ilerleyemeyen bot 90° yana adım atıp engeli dolanır.
//  - Saplantı sigortası: 6 sn'de ulaşılamayan kaynak/kese 12 sn kara listeye girer.

import { distSq } from '../../core/vec2.js';
import { range } from '../../core/rng.js';
import { SIM } from '../../data/balance.js';
import { isOutsideCendere } from '../zone.js';
import { canPickup } from './gatherSystem.js';

const THINK_INTERVAL = 0.5;
const PURSUE_TIMEOUT = 6; // sn: bu kadar süre ulaşılamayan hedef...
const AVOID_TIME = 12; // ...bu kadar süre yok sayılır

export function aiBotSystem(world) {
  for (const ent of world.movers) {
    const ai = ent.botAi;
    if (!ai || ent.dead) continue;
    const t = ent.transform;
    const g = ent.gather;

    // --- YOĞUNLAŞMA KORUMASI: kanal açıkken kımıldama, karar verme
    // (hasar yenirse kanal zaten kırılır ve sonraki tick normal AI devam eder)
    if (g.channel) {
      ent.input.moveX = 0;
      ent.input.moveY = 0;
      continue;
    }

    // --- Refleksler (her tick)
    if (ent.health.hp < ent.health.maxHp * 0.45 && g.pots > 0 && !g.potEffect) {
      ent.input.wantPot = true;
    }
    if (ent.progress.pendingCards > 0) {
      if (ent.progress.offer) {
        ent.input.pickCard = Math.floor(world.rng() * ent.progress.offer.length);
      } else {
        ent.input.wantCards = true;
      }
    }

    // --- Karar (aralıklı)
    ai.thinkT -= SIM.DT;
    if (ai.thinkT <= 0) {
      ai.thinkT = THINK_INTERVAL;
      decide(world, ent);
    }

    // --- Hedefe yürü
    const dx = ai.goalX - t.x;
    const dy = ai.goalY - t.y;
    const d = Math.hypot(dx, dy);
    if (d > ai.stopDist) {
      ent.input.moveX = dx / d;
      ent.input.moveY = dy / d;
    } else {
      ent.input.moveX = 0;
      ent.input.moveY = 0;
    }
  }
}

function decide(world, ent) {
  const ai = ent.botAi;
  const t = ent.transform;
  const p = ai.personality;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;

  // --- TAKILMA DEDEKTÖRÜ: hedef uzakta ama yerinde sayıyorsa engele çarpıyordur
  const movedSq = distSq(t.x, t.y, ai.lastX ?? t.x, ai.lastY ?? t.y);
  const goalDsq = distSq(t.x, t.y, ai.goalX, ai.goalY);
  if (goalDsq > (ai.stopDist + 6) ** 2 && movedSq < 9) ai.stuck = (ai.stuck ?? 0) + 1;
  else ai.stuck = 0;
  ai.lastX = t.x;
  ai.lastY = t.y;
  if (ai.stuck >= 2) {
    ai.stuck = 0;
    const gd = Math.sqrt(goalDsq) || 1;
    const nx = (ai.goalX - t.x) / gd;
    const ny = (ai.goalY - t.y) / gd;
    const side = world.rng() < 0.5 ? 1 : -1;
    ai.goalX = t.x + -ny * side * 50 + nx * 10;
    ai.goalY = t.y + nx * side * 50 + ny * 10;
    ai.stopDist = 6;
    return; // bu turda sadece engeli dolan
  }

  ai.stopDist = 4;
  ai.avoidRes ??= {}; // kaynakId → yok sayma bitiş zamanı (maç saati)

  // 1) Cendere dışındaysa: içeri kaç (mutlak öncelik)
  if (isOutsideCendere(world, t.x, t.y)) {
    setGoal(ai, cx, cy, 4);
    return;
  }

  // 2) Canı çok azsa: düşmandan uzağa kaç; güvendeyse durup YOĞUNLAŞ
  const threat = nearestEnemyPlayer(world, ent, 140);
  if (ent.health.hp < ent.health.maxHp * 0.3) {
    if (threat) {
      const fx = t.x - threat.transform.x;
      const fy = t.y - threat.transform.y;
      const fl = Math.hypot(fx, fy) || 1;
      setGoal(ai, t.x + (fx / fl) * 90, t.y + (fy / fl) * 90, 4);
      return;
    }
    if ((ent.combat?.inCombatT ?? 0) <= 0) {
      // Tehdit yok, savaş hali geçti: olduğu yerde dur ve can doldur
      setGoal(ai, t.x, t.y, 4);
      ent.input.wantGather = true;
      return;
    }
  }

  // 3) PvP fırsatı: yakında oyuncu + agresiflik + güç üstünlüğü.
  // Geç oyunda (Son Cendere/Ani Ölüm) çekingenlik biter: menzil büyür, eşik düşer —
  // yoksa eşit güçteki botlar sonsuza dek bakışıp maçı süründürür.
  const late = world.match.phase === 'son' || world.match.phase === 'aniolum';
  const enemy = nearestEnemyPlayer(world, ent, 60 + p.aggro * 60 + (late ? 120 : 0));
  if (enemy) {
    const myPower = ent.progress.level + ent.health.hp / 40;
    const theirPower = enemy.progress.level + enemy.health.hp / 40;
    let threshold = 1.25 - p.aggro * 0.45;
    if (late) threshold *= 0.55; // finalde eşit güce de dalar
    if (myPower >= theirPower * threshold) {
      setGoal(ai, enemy.transform.x, enemy.transform.y, ent.combat.auto.range * 0.7);
      if (world.rng() < p.aggro * 0.35) ent.input.wantSkill = true;
      return;
    }
  }

  // 4) Kese > kaynak > mob önceliğiyle hedef seç (kara liste + saplantı sigortalı)
  // stopDist 2: toplama TEMASLA olduğu için bot kaynağın üstüne yürür; pickup
  // temas anında gerçekleşip kaynağı kaldırdığından bot takılıp kalmaz.
  const kese = nearestUsableResource(world, ent, 120 * p.greed, 'kese');
  if (kese && pursue(world, ai, kese, 2)) return;

  const mob = nearestMob(world, ent, 170);
  const res = nearestUsableResource(world, ent, 220);
  const mobD = mob ? Math.hypot(mob.transform.x - t.x, mob.transform.y - t.y) : Infinity;
  const resD = res ? Math.hypot(res.transform.x - t.x, res.transform.y - t.y) : Infinity;

  if (mob && (mobD < resD * (0.7 + p.aggro * 0.6) || !res)) {
    ai.pursueId = 0;
    setGoal(ai, mob.transform.x, mob.transform.y, ent.combat.auto.range * 0.7);
    return;
  }
  if (res && resD < 900 && pursue(world, ai, res, 2)) return;

  // 5) Amaçsız: dolan — hedef varılana (ya da süresi dolana) kadar KORUNUR
  ai.pursueId = 0;
  ai.wanderT = (ai.wanderT ?? 0) - THINK_INTERVAL;
  const goalDist = Math.hypot(ai.goalX - t.x, ai.goalY - t.y);
  if (ai.mode === 'wander' && goalDist > 24 && ai.wanderT > 0) return;
  ai.mode = 'wander';
  ai.wanderT = 8;
  const r = Math.min(world.match.cendereR * 0.7, world.map.widthPx / 2 - 60);
  setGoal(ai, cx + range(world.rng, -r, r), cy + range(world.rng, -r, r), 4);
}

function setGoal(ai, x, y, stopDist) {
  ai.goalX = x;
  ai.goalY = y;
  ai.stopDist = stopDist;
  ai.mode = 'task';
}

/**
 * Kaynağı hedefle; aynı hedefe PURSUE_TIMEOUT'tur ulaşılamıyorsa kara listeye al.
 * true dönerse hedef kabul edildi (karar bitti).
 */
function pursue(world, ai, res, stopDist) {
  if (ai.pursueId === res.id) {
    ai.pursueT = (ai.pursueT ?? 0) + THINK_INTERVAL;
    if (ai.pursueT > PURSUE_TIMEOUT) {
      ai.avoidRes[res.id] = world.match.t + AVOID_TIME; // ulaşılamıyor: yok say
      ai.pursueId = 0;
      return false;
    }
  } else {
    ai.pursueId = res.id;
    ai.pursueT = 0;
  }
  setGoal(ai, res.transform.x, res.transform.y, stopDist);
  return true;
}

/** En yakın işe yarar pickup: kara listeli ve (doluysa) alınamayanlar hariç. */
function nearestUsableResource(world, ent, radius, onlyType = null) {
  const ai = ent.botAi;
  let best = null;
  let bestDsq = radius * radius;
  for (const res of world.resources) {
    if (onlyType ? res.resType !== onlyType : res.resType === 'kese') continue;
    if (res.resType !== 'kese' && !canPickup(ent, res)) continue; // pot/hız dolu: boşa yürüme
    if (ai.avoidRes?.[res.id] > world.match.t) continue;
    const dsq = distSq(ent.transform.x, ent.transform.y, res.transform.x, res.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = res;
    }
  }
  return best;
}

function nearestEnemyPlayer(world, ent, radius) {
  let best = null;
  let bestDsq = radius * radius;
  for (const other of world.movers) {
    if (other === ent || other.dead || other.kind !== 'player') continue;
    const dsq = distSq(ent.transform.x, ent.transform.y, other.transform.x, other.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = other;
    }
  }
  return best;
}

function nearestMob(world, ent, radius) {
  let best = null;
  let bestDsq = radius * radius;
  for (const other of world.movers) {
    if (other.dead || other.kind !== 'mob') continue;
    const dsq = distSq(ent.transform.x, ent.transform.y, other.transform.x, other.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = other;
    }
  }
  return best;
}
