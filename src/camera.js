/**
 * camera.js
 * Pan/zoom camera for the world view: world<->screen transforms, touch
 * (pinch + drag), mouse wheel, and eased programmatic pan/zoom for the
 * claim-code lookup.
 */

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * createCamera
 * Purpose:  Construct camera state centred on a world position.
 * Input:    x, y, zoom  number  (optional, default 0, 0, 1)
 * Output:   Object  — camera state
 */
export function createCamera({ x = 0, y = 0, zoom = 1 } = {}) {
  return { x, y, zoom, animating: false };
}

/**
 * worldToScreen
 * Purpose:  Project a world-space point to canvas pixel coordinates.
 * Input:    camera  Object
 *           canvas  HTMLCanvasElement
 *           wx, wy  number
 * Output:   { x: number, y: number }
 */
export function worldToScreen(camera, canvas, wx, wy) {
  return {
    x: (wx - camera.x) * camera.zoom + canvas.width / 2,
    y: (wy - camera.y) * camera.zoom + canvas.height / 2,
  };
}

/**
 * screenToWorld
 * Purpose:  Unproject a canvas pixel point to world-space coordinates.
 * Input:    camera  Object
 *           canvas  HTMLCanvasElement
 *           sx, sy  number
 * Output:   { x: number, y: number }
 */
export function screenToWorld(camera, canvas, sx, sy) {
  return {
    x: (sx - canvas.width / 2) / camera.zoom + camera.x,
    y: (sy - canvas.height / 2) / camera.zoom + camera.y,
  };
}

/**
 * attachCameraControls
 * Purpose:  Wire pointer (touch/mouse) drag + pinch and wheel zoom onto a
 *           canvas, mutating the given camera in place.
 * Input:    canvas  HTMLCanvasElement
 *           camera  Object  (mutated)
 * Output:   void
 */
export function attachCameraControls(canvas, camera) {
  const pointers = new Map();
  let lastDist = null;
  let lastMid = null;

  function midpoint() {
    const pts = [...pointers.values()];
    if (pts.length === 1) return pts[0];
    const [a, b] = pts;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function distance() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastDist = distance();
    lastMid = midpoint();
    camera.animating = false;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const mid = midpoint();
    if (pointers.size >= 2) {
      const dist = distance();
      if (lastDist && dist) camera.zoom = clampZoom(camera.zoom * (dist / lastDist));
      lastDist = dist;
    }
    if (lastMid) {
      camera.x -= (mid.x - lastMid.x) / camera.zoom;
      camera.y -= (mid.y - lastMid.y) / camera.zoom;
    }
    lastMid = mid;
  });

  function release(e) {
    pointers.delete(e.pointerId);
    lastDist = pointers.size >= 2 ? distance() : null;
    lastMid = pointers.size >= 1 ? midpoint() : null;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.animating = false;
    const before = screenToWorld(camera, canvas, e.clientX, e.clientY);
    camera.zoom = clampZoom(camera.zoom * (e.deltaY < 0 ? 1.12 : 0.89));
    const after = screenToWorld(camera, canvas, e.clientX, e.clientY);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }, { passive: false });
}

/**
 * panZoomTo
 * Purpose:  Start an eased camera move toward a world position and zoom.
 * Input:    camera      Object  (mutated)
 *           x, y        number  — target world position
 *           zoom        number  — target zoom
 *           durationMs  number  (default 700)
 * Output:   void
 */
export function panZoomTo(camera, x, y, zoom, durationMs = 700) {
  camera.animating = true;
  camera._animStart = performance.now();
  camera._animFrom = { x: camera.x, y: camera.y, zoom: camera.zoom };
  camera._animTo = { x, y, zoom: clampZoom(zoom) };
  camera._animDuration = durationMs;
}

/**
 * updateCameraAnimation
 * Purpose:  Advance an in-flight panZoomTo animation, if any.
 * Input:    camera  Object  (mutated)
 *           now     number  — performance.now() timestamp
 * Output:   void
 */
export function updateCameraAnimation(camera, now) {
  if (!camera.animating) return;
  const t = Math.min(1, (now - camera._animStart) / camera._animDuration);
  const ease = 1 - Math.pow(1 - t, 3);
  camera.x = camera._animFrom.x + (camera._animTo.x - camera._animFrom.x) * ease;
  camera.y = camera._animFrom.y + (camera._animTo.y - camera._animFrom.y) * ease;
  camera.zoom = camera._animFrom.zoom + (camera._animTo.zoom - camera._animFrom.zoom) * ease;
  if (t >= 1) camera.animating = false;
}
