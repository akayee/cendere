// Yanıp sönen bekleyen-kart göstergesi (PLAN §6): ekranı KAPLAMAZ, gözden kaçmaz.
// Sim event'lerini dinler; dokununca wantCards intent'i üretir.

export function createCardIndicator(onTap) {
  const el = document.createElement('div');
  el.id = 'card-indicator';
  el.innerHTML = '🂠<span id="card-badge"></span>';
  Object.assign(el.style, {
    position: 'fixed',
    top: 'calc(130px + env(safe-area-inset-top, 0px))', // minimap'ın altı
    right: '14px',
    width: '48px',
    height: '58px',
    borderRadius: '8px',
    background: 'rgba(30,26,60,0.75)',
    border: '2px solid #ffd75e',
    color: '#ffd75e',
    font: '30px/54px sans-serif',
    textAlign: 'center',
    userSelect: 'none',
    webkitUserSelect: 'none',
    cursor: 'pointer',
    zIndex: '20',
    display: 'none',
    animation: 'card-pulse 1s ease-in-out infinite',
  });

  const badge = el.querySelector('#card-badge');
  Object.assign(badge.style, {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    background: '#e85a5a',
    color: '#fff',
    font: 'bold 12px/20px monospace',
    padding: '0 3px',
  });

  const style = document.createElement('style');
  style.textContent =
    '@keyframes card-pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 4px #ffd75e; } 50% { transform: scale(1.12); box-shadow: 0 0 14px #ffd75e; } }';
  document.head.appendChild(style);

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onTap();
  });
  document.body.appendChild(el);

  return {
    setPending(count) {
      el.style.display = count > 0 ? 'block' : 'none';
      badge.textContent = String(count);
    },
  };
}
