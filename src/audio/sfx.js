// SFX motoru (ARCHITECTURE.md katmanı: audio/) — sim event'lerine main abone olur,
// bu modül yalnızca "çal" bilir. Web Audio: önden yüklenmiş buffer'lar, ses başına
// throttle (spam önleme), hafif pitch sapması (tekdüzelik kırılır), global mute.

const BASE = 'pack/Sounds/';

const SOUNDS = {
  swing: ['Game/Sword.wav', 0.35],
  arrow: ['Game/Hit5.wav', 0.25],
  bolt: ['Game/Fireball.wav', 0.3],
  burn: ['Game/Fire.wav', 0.4],
  hurt: ['Game/Hit2.wav', 0.5],
  kill: ['Game/Kill.wav', 0.5],
  levelup: ['Game/PowerUp1.wav', 0.55],
  card: ['Menu/Accept.wav', 0.5],
  cardOpen: ['Menu/Menu2.wav', 0.4],
  gather: ['Game/Coin.wav', 0.35],
  kese: ['Game/Bonus.wav', 0.55],
  process: ['Game/Success1.wav', 0.45],
  pot: ['Game/PowerUp2.wav', 0.45],
  poison: ['Game/Strange.wav', 0.5],
  phase: ['Game/Alert.wav', 0.5],
  danger: ['Game/Alert2.wav', 0.55],
  win: ['Game/Success3.wav', 0.6],
  lose: ['Game/GameOver2.wav', 0.6],
};

const MIN_INTERVAL = 0.07; // aynı ses için (sn)

export function createSfx() {
  /** @type {AudioContext|null} */
  let ctx = null;
  const buffers = new Map();
  const lastPlayed = new Map();
  let muted = localStorage.getItem('cendere-mute') === '1';

  async function load() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(
      Object.entries(SOUNDS).map(async ([key, [path]]) => {
        try {
          const res = await fetch(BASE + path);
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          buffers.set(key, buf);
        } catch {
          /* ses yüklenemezse oyun sessiz devam eder */
        }
      })
    );
  }

  // Mobil autoplay kilidi: ilk dokunuşta context'i uyandır
  function unlock() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  window.addEventListener('pointerdown', unlock, { passive: true });

  function play(key, { vol = 1, rate = 1 } = {}) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const buf = buffers.get(key);
    if (!buf) return;
    const now = ctx.currentTime;
    if (now - (lastPlayed.get(key) ?? -1) < MIN_INTERVAL) return;
    lastPlayed.set(key, now);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12); // hafif pitch sapması
    const gain = ctx.createGain();
    gain.gain.value = (SOUNDS[key]?.[1] ?? 0.5) * vol;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  return {
    load,
    play,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('cendere-mute', muted ? '1' : '0');
      return muted;
    },
  };
}
