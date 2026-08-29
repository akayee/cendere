// Evre duyuru bandı: ekranın üstünde belirip solan büyük yazı.

export function createBanner() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    top: '40%', // ekran ortası — evre ve GZ bildirimleri burada belirir
    left: '0',
    right: '0',
    textAlign: 'center',
    font: 'bold 26px Georgia, serif',
    letterSpacing: '5px',
    color: '#ffd75e',
    textShadow: '0 2px 8px #000, 0 0 22px #b0202066',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.4s',
    zIndex: '25',
  });
  document.body.appendChild(el);

  let hideTimer = 0;
  return {
    show(text, color = '#ffd75e') {
      el.textContent = text;
      el.style.color = color;
      el.style.opacity = '1';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => (el.style.opacity = '0'), 2600);
    },
  };
}
