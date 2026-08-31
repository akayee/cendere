import { describe, it, expect } from 'vitest';
import { createWorld } from '../src/sim/world.js';
import { createPlayer, createMob } from '../src/sim/entity.js';
import { step } from '../src/sim/pipeline.js';
import { applyRoot } from '../src/sim/systems/combatSystem.js';
import { applyCard } from '../src/sim/systems/progressionSystem.js';
import { CLASSES } from '../src/data/classes.js';
import { SIM } from '../src/data/balance.js';

const ROOT_T = CLASSES.kementci.skill.rootDuration;

function setup(seed = 909) {
  const world = createWorld(seed);
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const player = createPlayer(world, 'kementci', cx, cy);
  return { world, player, cx, cy };
}

describe('Kementçi — 4. sınıf (snareShot)', () => {
  it('zıpkın (auto) uzaktaki mobu vurur — projectile sınıfı', () => {
    const { world, player, cx, cy } = setup();
    const mob = createMob(world, 'slime', cx + 70, cy); // melee dışı, zıpkın menzili içi
    for (let i = 0; i < 120 && mob.health.hp === mob.health.maxHp; i++) step(world);
    expect(player.combat.auto.type).toBe('projectile');
    expect(mob.health.hp).toBeLessThan(mob.health.maxHp);
  });

  it('Kement isabeti hedefi YERE SABİTLER; süre bitince çözülür', () => {
    const { world, player, cx, cy } = setup();
    const mob = createMob(world, 'slime', cx + 70, cy);
    // Düz hatta kovalayan hedef: skillshot rotasında kalır (gezinen mob kaçabilir — tasarım)
    mob.ai.state = 'chase';
    mob.ai.targetId = player.id;
    player.combat.autoCd = 99; // yalnız kement uçsun
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.skillCd).toBeGreaterThan(0);
    const kement = world.projectiles.find((p) => p.kind === 'kement');
    expect(kement).toBeDefined();
    expect(kement.snare).toBe(ROOT_T);

    // Mermi hedefe varana kadar (70 birim / 300 hız ≈ 14 tick)
    for (let i = 0; i < 60 && !mob.motion.root; i++) {
      player.combat.autoCd = 99;
      step(world);
    }
    expect(mob.motion.root).not.toBeNull();

    // Root süresince mob (kovalasa da) YERİNDEN KIPIRDAMAZ
    const { x: rx, y: ry } = mob.transform;
    for (let i = 0; i < 20; i++) {
      player.combat.autoCd = 99;
      step(world);
    }
    expect(mob.transform.x).toBe(rx);
    expect(mob.transform.y).toBe(ry);

    // Süre dolunca çözülür ve mob yeniden hareket eder
    for (let i = 0; i < Math.ceil(ROOT_T / SIM.DT) + 2; i++) {
      player.combat.autoCd = 99;
      step(world);
    }
    expect(mob.motion.root).toBeNull();
    for (let i = 0; i < 30; i++) {
      player.combat.autoCd = 99;
      step(world);
    }
    expect(Math.hypot(mob.transform.x - rx, mob.transform.y - ry)).toBeGreaterThan(1);
  });

  it('menzilde hedef yoksa Kement harcanmaz (cooldown yanmaz)', () => {
    const { world, player } = setup();
    player.input.wantSkill = true;
    step(world);
    expect(player.combat.skillCd).toBe(0);
    expect(world.projectiles.length).toBe(0);
  });

  it('root\'lu rakip hareket EDEMEZ ama SALDIRABİLİR', () => {
    const { world, player, cx, cy } = setup();
    const foe = createPlayer(world, 'nisanci', cx + 40, cy);
    player.combat.auto = { ...player.combat.auto, damage: 0 }; // yalnız foe vursun
    player.combat.skillCd = 99; // kement de karışmasın
    applyRoot(world, foe, 5);
    foe.input.moveX = 1; // kaçmaya çalışsın — nafile
    const { x: fx, y: fy } = foe.transform;
    for (let i = 0; i < 60; i++) step(world);
    expect(foe.transform.x).toBe(fx); // sabit
    expect(foe.transform.y).toBe(fy);
    expect(player.health.hp).toBeLessThan(player.health.maxHp); // ama ok atmaya devam etti
  });

  it('root\'luyken ATILMA başlatılamaz (beceri hakkı yanmaz); root bitince serbest', () => {
    const world = createWorld(910);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const warrior = createPlayer(world, 'cengaver', cx, cy);
    applyRoot(world, warrior, 0.5);
    warrior.input.moveX = 1;
    warrior.input.wantSkill = true;
    step(world);
    expect(warrior.combat.dash).toBeNull();
    expect(warrior.combat.skillCd).toBe(0); // hak yanmadı
    expect(warrior.combat.charges).toBe(1);
    // Root çözüldükten sonra atılma normal çalışır
    for (let i = 0; i < Math.ceil(0.5 / SIM.DT) + 2; i++) step(world);
    warrior.input.moveX = 1;
    warrior.input.wantSkill = true;
    step(world);
    expect(warrior.combat.dash).not.toBeNull();
  });

  it('root yığılmaz, TAZELENİR (yeni isabet süreyi asla kısaltmaz)', () => {
    const { world, player } = setup();
    applyRoot(world, player, ROOT_T);
    for (let i = 0; i < 30; i++) step(world); // ~0.5 sn aksın
    expect(player.motion.root.t).toBeLessThan(ROOT_T - 0.4);
    applyRoot(world, player, ROOT_T);
    expect(player.motion.root.t).toBe(ROOT_T); // tazelendi
    applyRoot(world, player, 0.1);
    expect(player.motion.root.t).toBe(ROOT_T); // kısaltamaz
  });

  it('Çifte Atış (cifte_zipkin): +1 zıpkın, yalnız kementci havuzunda', () => {
    const { world, player, cx, cy } = setup();
    applyCard(player, 'cifte_zipkin');
    expect(player.combat.auto.projCount).toBe(2);
    createMob(world, 'slime', cx + 70, cy);
    player.combat.skillCd = 99;
    step(world);
    expect(world.projectiles.length).toBe(2); // yelpaze: iki zıpkın birden
  });

  it('kementçi BOT menzildeki rakibe kement atar ve sabitler (bot oynayabilir)', () => {
    const world = createWorld(9091);
    const cx = world.map.widthPx / 2;
    const cy = world.map.heightPx / 2;
    const victim = createPlayer(world, 'cengaver', cx, cy);
    victim.combat.auto = { ...victim.combat.auto, damage: 0 }; // insan susturuldu
    const bot = createPlayer(world, 'kementci', cx + 80, cy, {
      bot: true,
      personality: { aggro: 1, greed: 0.5 },
      name: 'KementBot',
    });
    bot.combat.auto = { ...bot.combat.auto, damage: 0 }; // kurban ölmesin, yalnız kement okunsun
    for (let i = 0; i < 60 * 15 && !victim.motion.root; i++) step(world);
    expect(victim.motion.root).not.toBeNull();
  }, 20000);
});
