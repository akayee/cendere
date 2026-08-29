// Kill feed (PUBG usulü): sağ kenarda beliren, birkaç saniye sonra solup
// kaybolan ölüm satırları. Yalnızca oyuncu ölümleri (mob spam'i yok).

const CSS = `
@keyframes kf-in { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
.kf-entry {
  animation: kf-in 0.25s ease-out;
  transition: opacity 0.6s;
  padding: 4px 10px;
  margin-top: 5px;
  border-radius: 8px;
  background: linear-gradient(170deg, rgba(24,22,48,0.82), rgba(12,10,26,0.82));
  border: 1px solid rgba(255,255,255,0.15);
  font: bold 11px monospace;
  color: #e8e8f0;
  text-shadow: 0 1px 2px #000;
  text-align: right;
  white-space: nowrap;
}`;

export function createKillFeed() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed',
    top: 'calc(198px + env(safe-area-inset-top, 0px))', // minimap + kart göstergesinin altı
    right: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    zIndex: '19',
  });
  document.body.appendChild(box);

  return {
    /** killer öldürdü victim'i. victimIsYou: kurban sensen kırmızı vurgu. */
    add(killer, victim, victimIsYou) {
      const el = document.createElement('div');
      el.className = 'kf-entry';
      const kColor = killer === 'Cendere' ? '#ff5252' : '#ffd75e';
      const vColor = victimIsYou ? '#ff6b6b' : '#c9d1d9';
      el.innerHTML =
        `<span style="color:${kColor}">${killer ?? '???'}</span>` +
        ` <span style="color:#8cd9ff">⚔</span> ` +
        `<span style="color:${vColor}">${victimIsYou ? 'SEN' : victim}</span>`;
      box.appendChild(el);

      setTimeout(() => (el.style.opacity = '0'), 3800);
      setTimeout(() => el.remove(), 4500);
      while (box.children.length > 5) box.firstChild.remove();
    },
  };
}
