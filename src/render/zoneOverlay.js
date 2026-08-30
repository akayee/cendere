// Cendere ve KİŞİSEL GZ görselleştirmesi: cendere dışı kızıl sisle örtülür;
// kendi üssün parlak altın, diğerlerininki soluk çizilir.

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

  // --- Kişisel GZ'ler
  for (const gz of world.gzones) {
    const r = gz.r * m.gzScale;
    if (r <= 3) continue;
    if (gz.x + r < view.minX || gz.x - r > view.maxX || gz.y + r < view.minY || gz.y - r > view.maxY) continue;
    const own = gz.ownerId === world.playerId;

    ctx.beginPath();
    ctx.arc(gz.x, gz.y, r, 0, Math.PI * 2);
    ctx.fillStyle = own ? 'rgba(255, 215, 94, 0.08)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = own ? 'rgba(255, 215, 94, 0.85)' : 'rgba(255, 235, 170, 0.3)';
    ctx.lineWidth = own ? 1.4 : 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(gz.x, gz.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
