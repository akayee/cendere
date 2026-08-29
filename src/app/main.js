// Composition root: katmanları kurar ve kablolar (ARCHITECTURE.md §2).
// Akış: lobi (sınıf seç) → maç → ölüm/zafer ekranı → yeni seed'le tekrar.

import { MAP, ZONE, xpForLevel } from '../data/balance.js';
import { PHASES, MATCH_END } from '../data/phases.js';
import { createWorld } from '../sim/world.js';
import { createPlayer } from '../sim/entity.js';
import { spawnInitialMobs, spawnBots } from '../sim/spawn.js';
import { step } from '../sim/pipeline.js';
import { isWild } from '../sim/zone.js';
import { createKeyboardInput } from '../input/keyboardInput.js';
import { createTouchInput } from '../input/touchInput.js';
import { SHEETS } from '../render/atlasData.js';
import { loadSheets } from '../render/spriteAtlas.js';
import { createCamera, snapCamera, followCamera, addShake } from '../render/camera.js';
import { createRenderer } from '../render/renderer.js';
import { createEffects } from '../render/effects.js';
import { drawJoystick } from '../ui/joystick.js';
import { createHud } from '../ui/hud.js';
import { createSkillButton } from '../ui/skillButton.js';
import { createCardIndicator } from '../ui/cardIndicator.js';
import { createCardScreen } from '../ui/cardScreen.js';
import { createContextButton } from '../ui/contextButton.js';
import { createPotButton } from '../ui/potButton.js';
import { createBanner } from '../ui/banner.js';
import { createCardReveal } from '../ui/cardReveal.js';
import { createKillFeed } from '../ui/killFeed.js';
import { createMinimap } from '../ui/minimap.js';
import { createDangerTint } from '../ui/tint.js';
import { createMuteButton } from '../ui/muteButton.js';
import { showLobby, showEndScreen } from '../ui/screens.js';
import { createSfx } from '../audio/sfx.js';
import { startLoop } from './gameLoop.js';

const ZOOM = 3;
const params = new URLSearchParams(location.search);

async function boot() {
  const sfx = createSfx();
  const [images] = await Promise.all([loadSheets(SHEETS), sfx.load()]);
  showLobby((classId) => startMatch(images, sfx, classId));
}

function startMatch(images, sfx, classId) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Sim (seed URL'den gelebilir; restart yeni seed üretir — app katmanı, izinli)
  const seed = Number(params.get('s')) || MAP.SEED;
  const world = createWorld(seed);
  const player = createPlayer(world, classId, world.map.widthPx / 2, world.map.heightPx / 2);
  spawnInitialMobs(world);
  spawnBots(world);
  const fastForward = Number(params.get('t')) || 0; // dev: maç saatini ileri sar
  if (fastForward > 0) world.match.t = fastForward;

  // --- Girdi
  const keyboard = createKeyboardInput();
  const touch = createTouchInput(canvas);
  let skillQueued = false;
  let cardsQueued = false;
  let pickQueued = -1;
  let gatherQueued = false;
  let potQueued = false;

  const skillButton = createSkillButton(() => (skillQueued = true));
  const cardIndicator = createCardIndicator(() => (cardsQueued = true));
  const cardScreen = createCardScreen((idx) => (pickQueued = idx));
  const contextButton = createContextButton(() => (gatherQueued = true));
  const potButton = createPotButton(() => (potQueued = true));
  const banner = createBanner();
  const cardReveal = createCardReveal();
  const killFeed = createKillFeed();
  const dangerTint = createDangerTint();
  createMuteButton(sfx);

  // --- Render + efektler
  const camera = createCamera(ZOOM * dpr);
  snapCamera(camera, player.transform.x, player.transform.y);
  const effects = createEffects();
  const renderer = createRenderer(canvas, images, world.map, effects);
  const hud = createHud();
  const minimap = createMinimap(world.map);

  // --- Sim event'leri → görsel tepkiler (ARCHITECTURE.md §6)
  world.bus.on('damage.dealt', (e) => {
    // Sarsıntı ve kırmızı renk SADECE senin yediğin hasarda (botlarınki titretmez)
    const isMe = e.targetId === player.id;
    const color = isMe ? '#ff7a7a' : e.crit ? '#ff9f43' : '#ffffff';
    effects.spawnText(e.x, e.y, e.crit ? e.amount + '!' : String(e.amount), color);
    if (isMe) {
      addShake(camera, 2.5);
      sfx.play('hurt');
    }
  });
  world.bus.on('auto.fired', (e) => {
    if (e.id === player.id) sfx.play(e.kind === 'bolt' ? 'bolt' : 'arrow');
  });
  world.bus.on('cendere.damage', (e) => {
    if (e.id === player.id) {
      effects.spawnText(e.x, e.y, String(e.amount), '#ff5252');
      addShake(camera, 1.5);
    }
  });
  world.bus.on('xp.gained', (e) => effects.spawnText(e.x + 8, e.y - 6, '+' + e.amount + ' XP', '#ffd75e'));
  world.bus.on('player.attack', (e) => {
    effects.spawnSlash(e.x, e.y, e.angle); // savuruş görseli — sarsıntı YOK (rahatsız ediyordu)
    if (e.id === player.id) sfx.play('swing');
  });
  world.bus.on('entity.died', (e) => {
    effects.spawnPoof(e.x, e.y);
    if (e.isHuman) addShake(camera, 5);
    if (e.kind === 'player') killFeed.add(e.killerName, e.name, e.isHuman);
    if (e.killerName === player.name) sfx.play('kill', { vol: e.kind === 'player' ? 1 : 0.55 });
  });
  world.bus.on('area.spawned', (e) => {
    if (e.id === player.id) sfx.play('burn');
  });
  world.bus.on('skill.noTarget', (e) => {
    if (e.id === player.id) effects.spawnText(player.transform.x, player.transform.y - 14, 'HEDEF YOK', '#9aa5b1');
  });
  world.bus.on('player.levelup', (e) => {
    // Işık sütunu HERKES için görünür (tasarım gereği — bilgi mekaniği);
    // UI güncellemeleri ve sarsıntı yalnızca kendi seviyemizde.
    effects.spawnLevelBeam(e.x, e.y);
    effects.spawnText(e.x, e.y - 10, 'SEVİYE ' + e.level + '!', '#ffd75e');
    if (e.id === player.id) {
      addShake(camera, 1.5);
      cardIndicator.setPending(e.pendingCards);
      sfx.play('levelup');
    }
  });
  world.bus.on('cards.offered', (e) => {
    if (e.id !== player.id) return; // bot teklifleri ekranımızı AÇMASIN
    cardScreen.show(e.cards);
    sfx.play('cardOpen');
  });
  world.bus.on('cards.picked', (e) => {
    if (e.id !== player.id) return;
    sfx.play('card');
    cardIndicator.setPending(e.pendingCards);
    effects.spawnText(player.transform.x, player.transform.y - 12, '✓', '#8cf58c');
    if (e.pendingCards > 0) cardsQueued = true;
    else cardScreen.hide();
  });
  world.bus.on('dummy.broken', (e) => effects.spawnText(e.x, e.y - 4, 'KIRILDI', '#9aa5b1'));
  world.bus.on('dummy.repaired', (e) => effects.spawnText(e.x, e.y - 4, 'ONARILDI', '#8cf58c'));
  const RES_NAMES = { wood: 'Kereste', ore: 'Cevher', herb: 'Pot' };
  world.bus.on('gather.done', (e) => {
    effects.spawnText(e.x, e.y - 6, `+${e.amount} ${RES_NAMES[e.resType]}`, '#a8e6a0');
    effects.spawnPoof(e.x, e.y);
    if (e.id === player.id) sfx.play('gather');
  });
  world.bus.on('gather.broken', (e) => {
    // Yalnızca kayda değer ilerleme kaybında ve sadece kendi kanalında göster
    if (e.id === player.id && e.reason === 'hasar' && e.progress > 0.4) {
      effects.spawnText(player.transform.x, player.transform.y - 14, 'BOZULDU!', '#ff9f43');
    }
  });
  world.bus.on('material.processed', (e) => {
    effects.spawnText(e.x, e.y - 16, e.text, '#ffd75e');
    if (e.id === player.id) sfx.play('process');
  });
  world.bus.on('focus.tick', (e) => effects.spawnText(e.x + 6, e.y - 8, '+' + e.amount, '#7ee8a0'));
  world.bus.on('pot.used', (e) => {
    effects.spawnText(e.x, e.y - 10, 'POT', '#ff6b6b');
    if (e.id === player.id) sfx.play('pot');
  });
  world.bus.on('kese.dropped', (e) => effects.spawnText(e.x, e.y - 8, 'GANİMET!', '#ffd75e'));
  world.bus.on('kese.opened', (e) => {
    if (e.id !== player.id) return;
    sfx.play('kese');
    if (e.cardId) cardReveal.show(e.cardId); // kazanılan kart dönerek belirir
    else effects.spawnText(e.x, e.y - 10, '+20 XP', '#c07ef5');
  });
  world.bus.on('projectile.hit', (e) => {
    if (e.kind === 'bolt') effects.spawnPoof(e.x, e.y);
  });
  world.bus.on('poison.applied', (e) => {
    effects.spawnText(e.x, e.y - 12, 'ZEHİR!', '#7ee84a');
    if (e.id === player.id) {
      banner.show('ZEHİRLENDİN — İYİLEŞME KİLİTLİ', '#7ee84a');
      sfx.play('poison');
    }
  });
  world.bus.on('poison.tick', (e) => effects.spawnText(e.x + 6, e.y, String(e.amount), '#7ee84a'));
  world.bus.on('poison.cured', (e) => {
    if (e.id === player.id) effects.spawnText(player.transform.x, player.transform.y - 12, 'ARINDIN', '#8cf58c');
  });
  world.bus.on('t3.spawned', () => {
    banner.show('ELİT YARATIKLAR BELİRDİ', '#c792ea');
    sfx.play('danger');
  });
  world.bus.on('t4.spawned', () => {
    banner.show('CENDERE CANAVARLARI SIZIYOR', '#ff5252');
    sfx.play('danger');
  });

  // --- Maç akışı event'leri
  world.bus.on('zone.phaseChanged', (e) => {
    const colors = { genisleme: '#ffd75e', sikisma: '#ff9f43', son: '#ff5252', aniolum: '#ff2222' };
    banner.show(e.name.toUpperCase(), colors[e.phase] ?? '#ffd75e');
    addShake(camera, 2);
    sfx.play('phase');
  });
  world.bus.on('zone.leftGZ', (e) => {
    if (e.id === player.id && world.match.gzR > 0) banner.show('GZ DIŞINDASIN — KORUMA YOK', '#ff9f43');
  });
  world.bus.on('zone.enteredGZ', (e) => {
    if (e.id === player.id && !player.zone.exiled) banner.show('GZ — GÜVENDESİN', '#8cf58c');
  });
  world.bus.on('zone.exiled', (e) => {
    if (e.id === player.id) banner.show('SÜRGÜN — GZ SENİ DIŞARI ATIYOR', '#ff6b6b');
  });
  world.bus.on('gz.burn', (e) => {
    if (e.id === player.id) effects.spawnText(e.x, e.y - 6, String(e.amount), '#ffb35a');
  });
  world.bus.on('zone.exileLifted', (e) => {
    if (e.id === player.id) banner.show('SÜRGÜN KALKTI', '#8cf58c');
  });
  world.bus.on('match.ended', (e) => {
    sfx.play(e.win ? 'win' : 'lose');
    const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    setTimeout(() => {
      showEndScreen({ win: e.win, level: player.progress.level, timeText: fmt(world.match.t) }, () => {
        location.href = location.pathname + '?s=' + ((Date.now() % 900000000) + 1);
      });
    }, e.win ? 400 : 900);
  });

  if (import.meta.env.DEV) window.__cendere = { world, player };

  let lastTime = performance.now();
  let prevAlive = Infinity;
  let tintWild = false;

  startLoop({
    update() {
      if (world.match.over) return;
      const t = touch.getAxis();
      const k = keyboard.getAxis();
      const axis = t.active ? t : k;
      player.input.moveX = axis.x;
      player.input.moveY = axis.y;
      if (skillQueued || keyboard.consumeSkill()) {
        player.input.wantSkill = true;
        skillQueued = false;
      }
      if (cardsQueued || keyboard.consumeCards()) {
        player.input.wantCards = true;
        cardsQueued = false;
      }
      if (pickQueued >= 0) {
        player.input.pickCard = pickQueued;
        pickQueued = -1;
      }
      if (gatherQueued || keyboard.consumeGather()) {
        player.input.wantGather = true;
        gatherQueued = false;
      }
      if (potQueued || keyboard.consumePot()) {
        player.input.wantPot = true;
        potQueued = false;
      }
      step(world);
    },
    render(alpha, timeSec) {
      const now = performance.now();
      const frameDt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      effects.update(frameDt);
      followCamera(camera, player.transform.x, player.transform.y, world.map, canvas.width, canvas.height);
      renderer.render(world, camera, alpha, timeSec, canvas.width, canvas.height);
      drawJoystick(ctx, touch, dpr);

      // Şarj varsa buton hazır görünür (Yankı Becerisi ile 2 şarj olabilir)
      skillButton.setCooldown(
        (player.combat.charges ?? 1) > 0 ? 0 : Math.max(0, player.combat.skillCd / player.combat.skill.cooldown)
      );

      let mode = '';
      if (player.gather.channel?.type === 'focus') mode = 'cancel';
      else if (!player.gather.channel && player.health.hp < player.health.maxHp) mode = 'focus';
      contextButton.setMode(mode);
      potButton.setCount(player.gather.pots);

      // Tehlike tonu: sınırda yürürken aç-kapa titremesin diye histerezisli
      {
        const d = Math.hypot(player.transform.x - world.map.widthPx / 2, player.transform.y - world.map.heightPx / 2);
        const gzR = world.match.gzR;
        if (!tintWild && (gzR <= 0 || d > gzR + 10)) tintWild = true;
        else if (tintWild && gzR > 0 && d < gzR - 10) tintWild = false;
        dangerTint.set(tintWild);
      }
      minimap.draw(world, player);

      const m = world.match;
      const next = PHASES[m.phaseIndex + 1];
      let alive = 0;
      for (const mv of world.movers) if (mv.kind === 'player' && !mv.dead) alive++;
      // Son 3'e / son 2'ye düşünce ekran ortası duyuru (toplu ölümde atlanmaz)
      if (prevAlive > 2 && alive === 2) banner.show('SON 2 — FİNAL', '#ff5252');
      else if (prevAlive > 3 && alive <= 3 && alive > 1) banner.show('SON 3 OYUNCU', '#ff9f43');
      prevAlive = alive;
      hud.frame(
        player,
        xpForLevel(player.progress.level),
        isWild(world, player.transform.x, player.transform.y),
        {
          t: m.t,
          phaseName: PHASES[m.phaseIndex].name,
          nextIn: next ? next.start - m.t : MATCH_END - m.t,
          alive,
        },
        ZONE.GZ_BUDGET
      );
    },
  });
}

boot().catch((err) => {
  document.getElementById('hud').textContent = 'HATA: ' + err.message;
  console.error(err);
});

// PWA: service worker yalnızca production build'de (dev'de cache karışıklığı olmasın)
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
