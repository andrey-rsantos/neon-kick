// The ball has unit mass. Cars are six times heavier; contacts transfer momentum
// along the actual 3D surface normal instead of adding an artificial upward kick.
const R = 1.3;
const INERTIA = 0.4 * R * R;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function makeBall() {
  return {
    x: 0,
    y: R,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    wx: 0,
    wy: 0,
    wz: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
  };
}
function prepare(b) {
  for (const key of ["wx", "wy", "wz", "qx", "qy", "qz"]) b[key] ??= 0;
  b.qw ??= 1;
}
function limit(b) {
  const speed = Math.hypot(b.vx, b.vz);
  if (speed > 28) {
    b.vx *= 28 / speed;
    b.vz *= 28 / speed;
  }
  b.vy = clamp(b.vy, -24, 24);
  const spin=Math.hypot(b.wx,b.wy,b.wz);
  if(spin>25){b.wx*=25/spin;b.wy*=25/spin;b.wz*=25/spin;}
}
// Impulse at the contact surface, including the angular response to friction.
function impulse(b, nx, ny, nz, jx, jy, jz) {
  b.vx += jx;
  b.vy += jy;
  b.vz += jz;
  b.wx += (R * (nz * jy - ny * jz)) / INERTIA;
  b.wy += (R * (nx * jz - nz * jx)) / INERTIA;
  b.wz += (R * (ny * jx - nx * jy)) / INERTIA;
}
function bounce(b, nx, ny, nz, restitution) {
  const normalSpeed = b.vx * nx + b.vy * ny + b.vz * nz;
  if (normalSpeed >= 0) return;
  const j = -(1 + restitution) * normalSpeed;
  b.vx += nx * j;
  b.vy += ny * j;
  b.vz += nz * j;
  const tx = b.vx - nx * (b.vx * nx + b.vy * ny + b.vz * nz);
  const ty = b.vy - ny * (b.vx * nx + b.vy * ny + b.vz * nz);
  const tz = b.vz - nz * (b.vx * nx + b.vy * ny + b.vz * nz);
  const friction = Math.min(0.08 * j, Math.hypot(tx, ty, tz) * 0.12);
  const length = Math.hypot(tx, ty, tz) || 1;
  impulse(
    b,
    nx,
    ny,
    nz,
    (-tx / length) * friction,
    (-ty / length) * friction,
    (-tz / length) * friction,
  );
}
export function hitBall(c, b) {
  prepare(b);
  const fx = Math.sin(c.angle),
    fz = -Math.cos(c.angle),
    rx = Math.cos(c.angle),
    rz = Math.sin(c.angle);
  const dx = b.x - c.x,
    dz = b.z - c.z;
  const side = clamp(dx * rx + dz * rz, -1, 1),
    along = clamp(dx * fx + dz * fz, -1.85, 1.85);
  const px = c.x + rx * side + fx * along,
    py = clamp(b.y, c.y + 0.3, c.y + 1),
    pz = c.z + rz * side + fz * along;
  let nx = b.x - px,
    ny = b.y - py,
    nz = b.z - pz;
  const distance = Math.hypot(nx, ny, nz);
  if (distance >= R) return 0;
  if (distance < 0.0001) {
    nx = fx;
    ny = 0;
    nz = fz;
  } else {
    nx /= distance;
    ny /= distance;
    nz /= distance;
  }
  const overlap = R - distance + 0.001;
  b.x += nx * overlap;
  b.y += ny * overlap;
  b.z += nz * overlap;
  const closing = (c.vx - b.vx) * nx + (c.vy - b.vy) * ny + (c.vz - b.vz) * nz;
  if (closing <= 0) return 0;
  const dashX =
    Math.sin(c.dashAngle) * c.dashForward + Math.cos(c.dashAngle) * c.dashSide;
  const dashZ =
    -Math.cos(c.dashAngle) * c.dashForward + Math.sin(c.dashAngle) * c.dashSide;
  const dashKick =
    c.dashTime > 0 && !c.dashHit && nx * dashX + nz * dashZ > 0.2;
  const j = (closing * 1.25) / (1 + 1 / 6) + (dashKick ? 6 : 0);
  if (dashKick) c.dashHit = true;
  b.vx += nx * j;
  b.vy += ny * j;
  b.vz += nz * j;
  c.vx -= (nx * j) / 6;
  c.vz -= (nz * j) / 6;
  // A glancing contact applies a small tangential impulse, producing visible spin.
  const tx = c.vx - b.vx,
    ty = c.vy - b.vy,
    tz = c.vz - b.vz;
  const tangentDot = tx * nx + ty * ny + tz * nz;
  const sx = tx - nx * tangentDot,
    sy = ty - ny * tangentDot,
    sz = tz - nz * tangentDot;
  const length = Math.hypot(sx, sy, sz) || 1,
    friction = Math.min(j * 0.045, length * 0.08);
  impulse(
    b,
    nx,
    ny,
    nz,
    (sx / length) * friction,
    (sy / length) * friction,
    (sz / length) * friction,
  );
  limit(b);
  return j;
}
function frameContact(b, ax, ay, az, bx, by, bz) {
  const dx = bx - ax,
    dy = by - ay,
    dz = bz - az;
  const t = clamp(
    ((b.x - ax) * dx + (b.y - ay) * dy + (b.z - az) * dz) /
      (dx * dx + dy * dy + dz * dz),
    0,
    1,
  );
  let nx = b.x - (ax + dx * t),
    ny = b.y - (ay + dy * t),
    nz = b.z - (az + dz * t);
  const d = Math.hypot(nx, ny, nz),
    radius = R + 0.125;
  if (d >= radius) return;
  if (d < 0.0001) {
    nx = 0;
    ny = 0;
    nz = az > 0 ? -1 : 1;
  } else {
    nx /= d;
    ny /= d;
    nz /= d;
  }
  b.x += nx * (radius - d);
  b.y += ny * (radius - d);
  b.z += nz * (radius - d);
  bounce(b, nx, ny, nz, 0.72);
}
function substep(b, dt) {
  const resting = b.y <= R + 0.002 && Math.abs(b.vy) < 0.2;
  if (!resting) b.vy -= 17 * dt;
  else b.vy = 0;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
  if (b.y <= R) {
    b.y = R;
    if (b.vy < -1.1) bounce(b, 0, 1, 0, 0.58);
    else b.vy = 0;
  }
  if (b.y <= R + 0.002 && b.vy < 0.2) {
    // Cancel slip at the grass contact before applying rolling resistance.
    const slipX = b.vx + b.wz * R,
      slipZ = b.vz - b.wx * R;
    const slip = Math.hypot(slipX, slipZ),
      j = Math.min(slip / 3.5, 0.45 * 17 * dt);
    if (slip > 0.0001)
      impulse(b, 0, 1, 0, (-slipX / slip) * j, 0, (-slipZ / slip) * j);
    const speed = Math.hypot(b.vx, b.vz),
      next = Math.max(0, speed - 1.6 * dt);
    if (speed > 0) {
      b.vx *= next / speed;
      b.vz *= next / speed;
    }
    if (slip < 0.2) {
      b.wx = b.vz / R;
      b.wz = -b.vx / R;
    }
    if (next < 0.035) {
      b.vx = 0;
      b.vz = 0;
      b.wx = 0;
      b.wz = 0;
    }
  }
  const drag = Math.exp(-0.035 * dt);
  b.vx *= drag;
  b.vz *= drag;
  b.wy *= Math.exp(-0.7 * dt);
  b.wx *= Math.exp(-.3 * dt);
  b.wz *= Math.exp(-.3 * dt);
  if (b.y > 16) {
    b.y = 16;
    bounce(b, 0, -1, 0, 0.65);
  }
  if (Math.abs(b.x) > 21 - R) {
    const sign = Math.sign(b.x);
    b.x = sign * (21 - R);
    bounce(b, -sign, 0, 0, 0.78);
  }
  // Rounded corners return the ball to play instead of trapping it between two planes.
  if(Math.abs(b.x)>17&&Math.abs(b.z)>28){
    const cx=Math.sign(b.x)*17,cz=Math.sign(b.z)*28;
    const dx=b.x-cx,dz=b.z-cz,d=Math.hypot(dx,dz);
    if(d>4-R){b.x=cx+dx/d*(4-R);b.z=cz+dz/d*(4-R);bounce(b,-dx/d,0,-dz/d,.78);}
  }
  for (const sign of [-1, 1]) {
    frameContact(b, -7, 0, sign * 32, -7, 6, sign * 32);
    frameContact(b, 7, 0, sign * 32, 7, 6, sign * 32);
    frameContact(b, -7, 6, sign * 32, 7, 6, sign * 32);
  }
  const side = Math.sign(b.z) || 1;
  // Solid end wall outside the goal opening. The posts resolve its rounded edges.
  if (Math.abs(b.z) > 32 - R && (Math.abs(b.x) >= 7 || b.y >= 6)) {
    b.z = side * (32 - R);
    bounce(b, 0, 0, -side, 0.78);
  }
  // Only a ball entirely across the line and inside the opening scores.
  if (Math.abs(b.z) > 32 + R && Math.abs(b.x) <= 7 - R && b.y <= 6 - R)
    return side < 0 ? 0 : 1;
  // Goal tunnel prevents a partial crossing escaping sideways or through the net.
  if (Math.abs(b.z) > 32 && Math.abs(b.x) < 7 && b.y < 6) {
    if (Math.abs(b.x) > 7 - R) {
      const sx = Math.sign(b.x);
      b.x = sx * (7 - R);
      bounce(b, -sx, 0, 0, 0.45);
    }
    if (b.y > 6 - R) {
      b.y = 6 - R;
      bounce(b, 0, -1, 0, 0.45);
    }
  }
  if (Math.abs(b.z) > 36 - R) {
    b.z = side * (36 - R);
    bounce(b, 0, 0, -side, 0.45);
  }
  // Integrate world angular velocity into a normalized quaternion.
  const { qx, qy, qz, qw } = b,
    h = dt * 0.5;
  b.qx += h * (b.wx * qw + b.wy * qz - b.wz * qy);
  b.qy += h * (-b.wx * qz + b.wy * qw + b.wz * qx);
  b.qz += h * (b.wx * qy - b.wy * qx + b.wz * qw);
  b.qw += h * (-b.wx * qx - b.wy * qy - b.wz * qz);
  const norm = Math.hypot(b.qx, b.qy, b.qz, b.qw);
  b.qx /= norm;
  b.qy /= norm;
  b.qz /= norm;
  b.qw /= norm;
  limit(b);
  return -1;
}
export function stepBall(b, dt) {
  prepare(b);
  const steps = Math.max(1, Math.ceil(dt * 120));
  for (let i = 0; i < steps; i++) {
    const goal = substep(b, dt / steps);
    if (goal >= 0) return goal;
  }
  return -1;
}
