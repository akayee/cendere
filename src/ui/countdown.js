// Maç açılışı geri sayımı: ekran ortasında belirip büyüyen/solan büyük sayı.
// Sadece görsel — zamanlamayı app (main.js) sürer, bu bileşen yalnız gösterir.

export function createCountdown() {
  // Pop animasyonu: küçük belirir → hafif taşar → oturur → solarak büyür
  const style = document.createElement('style');
  style.textContent = `@keyframes cd-pop {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.35); }
    22%  { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
    45%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    75%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1.05); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
  }`;
  document.head.appendChild(style);

  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    top: '31%', // ekran ortasının üstü: merkezdeki (yanıp sönen) oyuncuyu örtmesin
    left: '50%',
    transform: 'translate(-50%, -50%)',
    font: 'bold 92px Georgia, serif',
    letterSpacing: '4px',
    color: '#ffd75e',
    textShadow: '0 3px 12px #000, 0 0 34px #b0202088, 0 0 8px #fff6',
    pointerEvents: 'none',
    opacity: '0',
    zIndex: '26',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(el);

  let current = '';
  return {
    /** Yazıyı değiştirir ve pop animasyonunu baştan oynatır (aynı yazıda tekrar tetiklemez). */
    set(text, { durationSec = 1, big = true } = {}) {
      if (text === current) return;
      current = text;
      el.textContent = text;
      el.style.fontSize = big ? '92px' : '38px';
      el.style.letterSpacing = big ? '4px' : '6px';
      // Animasyonu sıfırla → yeniden başlat (reflow tetiklemesi bilinçli)
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = `cd-pop ${durationSec}s ease-out forwards`;
    },
    /** İş bitti: DOM'dan tamamen kalkar. */
    destroy() {
      el.remove();
      style.remove();
    },
  };
}
