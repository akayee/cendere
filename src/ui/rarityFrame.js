// Nadirlik çerçeve dili — üç kart UI'ının (cardScreen şeridi / cardReveal
// gösterisi / cardCatalog listesi) ORTAK görsel sözlüğü. Desen: kartın dışında
// padding'li bir sarmalayıcı, zemini nadirlik degradesi → padding "degrade
// kenarlık" gibi okunur, iç kart RARITY.bg zeminini basar.
//   Sıradan  : gümüş/gri degrade çerçeve
//   Nadir    : mor degrade + sabit glow
//   Destansı : altın shimmer (kayan degrade) + nabız glow + köşe elmasları
// Animasyonlar SARMALAYICIDA yaşar; kartın kendi giriş/dönüş animasyonu ayrı
// elementte ya da animation listesine eklenerek çakışmadan birleşir.

/** Shimmer/glow keyframe'lerini bir kez enjekte eder (animasyonlu UI'lar çağırır). */
export function ensureFrameCss() {
  if (document.getElementById('rarity-frame-css')) return;
  const style = document.createElement('style');
  style.id = 'rarity-frame-css';
  style.textContent = `
@keyframes epic-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
@keyframes epic-glow { 0%,100% { box-shadow: 0 0 10px #ffb54588, 0 3px 12px #000c; } 50% { box-shadow: 0 0 18px #ffb545cc, 0 3px 12px #000c; } }`;
  document.head.appendChild(style);
}

/**
 * Sarmalayıcının stil nesnesi (camelCase — Object.assign(el.style, ...) için).
 * animate:false → yoğun listeler (katalog: onlarca kart) animasyon BASMAZ;
 * destansı yalnız hafif sabit glow alır, nadirde glow da kısılır.
 * Destansı animate:true dönüşünde caller kendi giriş animasyonunu
 * `animation` alanının BAŞINA virgülle ekleyebilir.
 */
export function frameStyle(rarKey, color, { animate = true } = {}) {
  if (rarKey === 'epic') {
    if (!animate) {
      return {
        background: `linear-gradient(120deg, ${color}, #fff3c4 35%, ${color} 60%, #b06a12)`,
        boxShadow: `0 0 8px ${color}55`,
      };
    }
    return {
      background: `linear-gradient(120deg, ${color}, #fff3c4, ${color}, #b06a12, ${color})`,
      backgroundSize: '300% 100%',
      animation: 'epic-shimmer 2.2s linear infinite, epic-glow 1.6s ease-in-out infinite',
    };
  }
  if (rarKey === 'rare') {
    const s = { background: `linear-gradient(165deg, #e6c8ff, ${color} 35%, #5b2e8a 80%)` };
    if (animate) s.boxShadow = `0 0 10px ${color}66, 0 3px 12px #000c`;
    return s;
  }
  // Sıradan (ve RARITY dışı bilinmeyen nadirlikler — katalog "DİĞER" grubu)
  const s = { background: `linear-gradient(165deg, #f2f5f7, ${color} 40%, #5c6670 85%)` };
  if (animate) s.boxShadow = '0 3px 10px #000c';
  return s;
}

/** frameStyle'ın inline `style="..."` dizesi hali (HTML dizesi kuran UI'lar için). */
export function frameCssText(rarKey, color, opts) {
  return Object.entries(frameStyle(rarKey, color, opts))
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
    .join(';');
}

/** Dört köşe elması (destansı süsü). Ebeveyn position:relative/fixed olmalı. */
export function cornersHtml(color) {
  const c = (pos) =>
    `<div style="position:absolute;width:8px;height:8px;transform:rotate(45deg);border-radius:1px;` +
    `${pos};background:${color};box-shadow:0 0 4px ${color}"></div>`;
  return (
    c('top:-2px;left:-2px') + c('top:-2px;right:-2px') +
    c('bottom:-2px;left:-2px') + c('bottom:-2px;right:-2px')
  );
}
