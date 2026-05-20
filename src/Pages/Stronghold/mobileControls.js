// src/Pages/Stronghold/mobileControls.js
// Shared mobile joystick + touch helpers.
//
// Design — drag-vs-tap detection:
//   • touchstart: record origin, mark as PENDING (not yet joystick)
//   • touchmove:  if distance > DRAG_THRESHOLD → promote to joystick, suppress scroll
//   • touchend:   if never promoted → fire as a synthetic "tap" callback
//                 if promoted         → release joystick silently
//
// This means ANY touch anywhere can become either movement OR placement,
// with no zone restrictions, and the building selector strip (outside the
// canvas) still scrolls freely because its touches never hit the canvas.

export const JOYSTICK_MAX_RADIUS = 52;
export const JOYSTICK_DEAD_ZONE  = 6;   // px — below this, vec stays (0,0)
export const DRAG_THRESHOLD      = 10;  // px movement before a touch becomes a joystick

/**
 * Creates the joystick state object.
 * Store this in a React ref: joystickRef.current = createJoystick()
 */
export function createJoystick() {
  return {
    active:    false,   // true once drag threshold exceeded
    pending:   false,   // touch down but not yet confirmed as drag
    touchId:   null,
    origin:    { x: 0, y: 0 },
    current:   { x: 0, y: 0 },
    vec:       { x: 0, y: 0 }, // normalised [-1..1]
    opacity:   0,
  };
}

/**
 * Call from canvas touchstart.
 * Always claims the first free touch — returns true so caller knows to
 * call preventDefault only if/when it becomes a drag.
 */
export function joystickTouchStart(joy, touch) {
  if (joy.active || joy.pending) return false; // already tracking one touch

  joy.pending = true;
  joy.active  = false;
  joy.touchId = touch.identifier;
  joy.origin  = { x: touch.clientX, y: touch.clientY };
  joy.current = { x: touch.clientX, y: touch.clientY };
  joy.vec     = { x: 0, y: 0 };
  joy.opacity = 0;
  return true;
}

/**
 * Call from canvas touchmove.
 * Returns "drag" if this is a joystick move (caller should preventDefault),
 * returns "pending" if still within tap threshold,
 * returns false if touch doesn't belong to us.
 */
export function joystickTouchMove(joy, touch) {
  if ((!joy.active && !joy.pending) || touch.identifier !== joy.touchId) return false;

  joy.current = { x: touch.clientX, y: touch.clientY };

  const dx = touch.clientX - joy.origin.x;
  const dy = touch.clientY - joy.origin.y;
  const d  = Math.sqrt(dx * dx + dy * dy);

  // Promote pending → active once drag threshold is crossed
  if (!joy.active && d > DRAG_THRESHOLD) {
    joy.active  = true;
    joy.pending = false;
    joy.opacity = 1;
  }

  if (joy.active) {
    if (d < JOYSTICK_DEAD_ZONE) {
      joy.vec = { x: 0, y: 0 };
    } else {
      const clamped = Math.min(d, JOYSTICK_MAX_RADIUS);
      const angle   = Math.atan2(dy, dx);
      joy.vec = {
        x: Math.cos(angle) * (clamped / JOYSTICK_MAX_RADIUS),
        y: Math.sin(angle) * (clamped / JOYSTICK_MAX_RADIUS),
      };
    }
    return "drag";
  }

  return "pending";
}

/**
 * Call from canvas touchend / touchcancel.
 * Returns:
 *   { wasTap: true,  x, y } — short tap, caller should treat as a click
 *   { wasTap: false }       — was a joystick drag, nothing to do
 *   false                   — touch not ours
 */
export function joystickTouchEnd(joy, touch) {
  if ((!joy.active && !joy.pending) || touch.identifier !== joy.touchId) return false;

  const wasTap = !joy.active; // never became a drag
  const tapX   = joy.origin.x;
  const tapY   = joy.origin.y;

  joy.active  = false;
  joy.pending = false;
  joy.touchId = null;
  joy.vec     = { x: 0, y: 0 };
  joy.opacity = 0;

  return wasTap ? { wasTap: true, x: tapX, y: tapY } : { wasTap: false };
}

/**
 * Draw the joystick on the canvas (call after all world drawing).
 */
export function drawJoystick(ctx, joy) {
  if (!joy.active) return;

  const ox   = joy.origin.x;
  const oy   = joy.origin.y;
  const maxR = JOYSTICK_MAX_RADIUS;
  const alpha = joy.opacity;

  const dx    = joy.current.x - ox;
  const dy    = joy.current.y - oy;
  const d     = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const knobR = Math.min(d, maxR);
  const kx    = ox + Math.cos(angle) * knobR;
  const ky    = oy + Math.sin(angle) * knobR;

  ctx.save();

  // Outer ring
  ctx.beginPath();
  ctx.arc(ox, oy, maxR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.18 * alpha})`;
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.fillStyle   = `rgba(255,255,255,${0.03 * alpha})`;
  ctx.fill();

  // Crosshair guides
  ctx.globalAlpha = 0.10 * alpha;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth   = 1;
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([nx, ny]) => {
    ctx.beginPath();
    ctx.moveTo(ox + nx * 10,          oy + ny * 10);
    ctx.lineTo(ox + nx * (maxR - 6),  oy + ny * (maxR - 6));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Knob fill
  ctx.beginPath();
  ctx.arc(kx, ky, 20, 0, Math.PI * 2);
  ctx.fillStyle   = `rgba(255,255,255,${0.18 * alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.42 * alpha})`;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Knob centre dot
  ctx.beginPath();
  ctx.arc(kx, ky, 5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.75 * alpha})`;
  ctx.fill();

  ctx.restore();
}