// Sanal joystick görseli. touchInput.state'i OKUR, ekran uzayında çizer.

export function drawJoystick(ctx, touch, dpr) {
  const s = touch.state;
  if (!s.active) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Dış çember
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.originX, s.originY, touch.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Topuz
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(s.knobX, s.knobY, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
