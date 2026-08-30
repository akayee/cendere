// Denge harness'i: insansız (yalnız bot) maçları hızlı koşturur, sınıf bazında
// kazanma/kill/seviye istatistikleri basar. Kullanım: node tools/balance.mjs [maçSayısı]
// Yeni mekaniklerle uyumlu: temasla anında toplama (kanal yok), GZ yok, pickup etkileri.

import { createWorld } from '../src/sim/world.js';
import { spawnMatch } from '../src/sim/spawn.js';
import { step } from '../src/sim/pipeline.js';
import { MATCH_END } from '../src/data/phases.js';

const MATCHES = Number(process.argv[2]) || 20;
const stats = {};
const S = (cls) => (stats[cls] ??= { win: 0, kills: 0, levelSum: 0, deaths: 0, aliveAtEnd: 0 });

for (let m = 0; m < MATCHES; m++) {
  const world = createWorld(10000 + m * 7919);
  spawnMatch(world, null); // insan yok: 9 bot, 3'er adet her sınıftan
  const bots = world.movers.filter((b) => b.botAi);
  const clsOf = new Map(bots.map((b) => [b.name, b.classId]));

  world.bus.on('entity.died', (e) => {
    if (e.kind !== 'player') return;
    S(clsOf.get(e.name)).deaths++;
    const killerCls = clsOf.get(e.killerName);
    if (killerCls) S(killerCls).kills++;
  });

  const maxTicks = (MATCH_END + 2) * 60;
  for (let i = 0; i < maxTicks && !world.match.over; i++) step(world);

  const alive = world.movers.filter((b) => b.kind === 'player' && !b.dead);
  for (const b of alive) S(b.classId).aliveAtEnd++;
  if (alive.length >= 1) {
    // Kazanan: tek kalan; süre dolduysa en yüksek can yüzdesi
    const winner = alive.sort((a, b) => b.health.hp / b.health.maxHp - a.health.hp / a.health.maxHp)[0];
    S(winner.classId).win++;
  }
  for (const b of bots) if (!b.dead) S(b.classId).levelSum += b.progress.level;
}

console.log(`\n${MATCHES} maç (9 bot: 3 cengaver / 3 nisanci / 3 ocakci)\n`);
console.log('sınıf     | galibiyet | kill | ölüm | maç sonu hayatta | ort. seviye (hayatta)');
for (const [cls, s] of Object.entries(stats)) {
  const avgLvl = s.aliveAtEnd > 0 ? (s.levelSum / s.aliveAtEnd).toFixed(1) : '-';
  console.log(
    `${cls.padEnd(9)} | ${String(s.win).padStart(9)} | ${String(s.kills).padStart(4)} | ${String(s.deaths).padStart(4)} | ${String(s.aliveAtEnd).padStart(4)}             | ${avgLvl}`
  );
}
