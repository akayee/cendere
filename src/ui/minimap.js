// Minimap (sağ üst): cendere çemberi, göller, SEN ve SINIRLI istihbarat —
// rakipler yalnızca yakındaysa görünür; Son Cendere'den itibaren herkes görünür
// (tam bilgi BR gerilimini öldürür, finalde ise bulmayı garantiler).

const SIZE = 116;
const NEAR_RANGE = 260; // rakip bu menzildeyse haritada belirir

export function createMinimap(map) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  Object.assign(canvas.style, {
    position: 'fixed',
    top: 'calc(6px + env(safe-area-inset-top, 0px))',
    right: '10px',
    width: SIZE + 'px',
    height: SIZE + 'px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(12,10,26,0.7)',
    pointerEvents: 'none',
    zIndex: '18',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const k = SIZE / map.widthPx; // dünya → minimap ölçeği

  return {
    draw(world, player) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Zemin + göller
      ctx.fillStyle = 'rgba(110,130,60,0.5)';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(120,200,235,0.8)';
      for (const l of map.lakes) {
        ctx.fillRect(l.tx * map.tile * k, l.ty * map.tile * k, l.tw * map.tile * k, l.th * map.tile * k);
      }

      const cx = SIZE / 2;
      const cy = SIZE / 2;
      const m = world.match;

      // Cendere dışı kızıl
      if (m.cendereR * k < SIZE) {
        ctx.beginPath();
        ctx.rect(0, 0, SIZE, SIZE);
        ctx.arc(cx, cy, m.cendereR * k, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160,30,40,0.45)';
        ctx.fill('evenodd');
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, m.cendereR * k, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Kamplar (PvE hedefleri — "kamp bulamıyorum" çözümü): T2 turuncu, elit mor
      for (const camp of world.camps) {
        if (!camp.memberIds.some((id) => world.entities.has(id))) continue;
        ctx.fillStyle = camp.tier >= 3 ? '#c792ea' : '#ff9f43';
        ctx.beginPath();
        ctx.arc(camp.x * k, camp.y * k, camp.tier >= 3 ? 2.6 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rakipler: yakındakiler her zaman; Son Cendere'den itibaren herkes
      const showAll = m.phase === 'son' || m.phase === 'aniolum';
      for (const ent of world.movers) {
        if (ent.kind !== 'player' || ent.id === player.id || ent.dead) continue;
        const dx = ent.transform.x - player.transform.x;
        const dy = ent.transform.y - player.transform.y;
        if (!showAll && dx * dx + dy * dy > NEAR_RANGE * NEAR_RANGE) continue;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(ent.transform.x * k, ent.transform.y * k, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // SEN
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.transform.x * k, player.transform.y * k, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
  };
}
