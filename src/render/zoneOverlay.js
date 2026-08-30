// Cendere görselleştirmesi: cendere dışı kızıl sisle örtülür, sınır nabız atar.
// (Kişisel GZ çizimleri kaldırıldı — tek sınır cenderedir.)

export function drawZones(ctx, world, view, timeSec) {
  const m = world.match;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;

  // --- Cendere dışı: kızıl sis (evenodd: görünür alan - çember)
  if (m.cendereR < 2000) {
    ctx.beginPath();
    ctx.rect(view.minX, view.minY, view.maxX - view.minX, view.maxY - view.minY);
    ctx.arc(cx, cy, m.cendereR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140, 20, 30, 0.34)';
    ctx.fill('evenodd');

    const pulse = 0.55 + 0.3 * Math.sin(timeSec * 3);
    ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, m.cendereR, 0, Math.PI * 2);
    ctx.stroke();
  }
}
