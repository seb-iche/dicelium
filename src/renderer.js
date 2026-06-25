/**
 * renderer.js
 * All drawing is done via putImageData for true 1×1 pixel cells.
 * Threads between cells are drawn with ctx.fillRect(x, y, 1, 1) per pixel
 * along a Bresenham line so they stay pixel-perfect too.
 */

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { ctx };
}

export function resizeCanvas(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Bresenham line — fills 1×1 pixel rects along the path
function drawPixelLine(ctx, x0, y0, x1, y1, r, g, b, alpha) {
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  while (true) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function render(ctx, world) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Fade trail
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, W, H);

  // Draw threads between sibling cells in same colony
  for (const col of world.colonies) {
    const sorted = col.cells.slice().sort((a, b) => a.generation - b.generation);
    const [tr, tg, tb] = col.bloomed ? hexToRgb(col.neonColor) : [200, 200, 200];
    for (let i = 1; i < sorted.length; i += 2) {
      const a = sorted[i - 1], b = sorted[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 14) {
        const alpha = col.bloomed
          ? Math.min(0.3, a.alpha * 0.35)
          : Math.min(0.15, a.alpha * 0.2);
        drawPixelLine(ctx, a.x, a.y, b.x, b.y, tr, tg, tb, alpha);
      }
    }
  }

  // Draw spores as single white pixels
  for (const s of world.spores) {
    const sx = Math.floor(s.x), sy = Math.floor(s.y);
    ctx.fillStyle = `rgba(180,255,255,${(s.life * 0.7).toFixed(2)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Draw cells as 1×1 pixels via fillRect
  for (const c of world.cells) {
    const px = Math.floor(c.x), py = Math.floor(c.y);
    const alpha = Math.min(1, c.alpha);

    if (c.bloomed && c.neonColor) {
      const [r, g, b] = hexToRgb(c.neonColor);
      const glow = c.age > 30 ? Math.min(1, (c.age - 30) / 60) : 0;
      const a = (alpha * (0.7 + 0.3 * glow)).toFixed(2);
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    } else {
      const grey = 190;
      ctx.fillStyle = `rgba(${grey},${grey},${grey},${(alpha * 0.55).toFixed(2)})`;
    }

    ctx.fillRect(px, py, 1, 1);
  }
}
