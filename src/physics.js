export const FIELD = { width: 42, length: 64, goal: 14, height: 6, ball: 1.3 };
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const DASH_DURATION = 0.32;
export function makeCar(z, angle = 0) {
  return {
    x: 0,
    z,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    angle,
    boost: 100,
    jumpReady: true,
    steer: 0,
    airTime: 0,
    dashTime: 0,
    dashUsed: false,
    dashHit: false,
    dashForward: 1,
    dashSide: 0,
    dashAngle: 0,
  };
}
export function drive(c, input, dt) {
  c.dashTime = Math.max(0, c.dashTime - dt);
  if (input.jump && c.jumpReady) {
    c.jumpReady = false;
    if (c.y === 0) {
      c.vy = 8.8;
    } else if (!c.dashUsed && c.airTime < 0.65) {
      // One directional dodge per jump; no direction defaults to a forward flip.
      const forward = input.throttle || (input.steer ? 0 : 1);
      const length = Math.hypot(forward, input.steer);
      c.dashForward = forward / length;
      c.dashSide = input.steer / length;
      c.dashAngle = c.angle;
      c.dashTime = DASH_DURATION;
      c.dashUsed = true;
      c.dashHit = false;
      c.vx +=
        (Math.sin(c.angle) * c.dashForward + Math.cos(c.angle) * c.dashSide) *
        8;
      c.vz +=
        (-Math.cos(c.angle) * c.dashForward + Math.sin(c.angle) * c.dashSide) *
        8;
      const magnitude = Math.hypot(c.vx, c.vz);
      if (magnitude > 23) {
        c.vx *= 23 / magnitude;
        c.vz *= 23 / magnitude;
      }
      c.vy = Math.min(c.vy, 1.5);
    }
  }
  if (!input.jump) c.jumpReady = true;
  const dashing = c.dashTime > 0;
  const forwardX = Math.sin(c.angle),
    forwardZ = -Math.cos(c.angle);
  const speed = c.vx * forwardX + c.vz * forwardZ;
  c.steer = input.steer;
  const yaw =
    input.steer *
    (dashing ? 0 : 1) *
    dt *
    2.2 *
    (0.5 + 0.5 * Math.min(Math.abs(speed) / 12, 1)) *
    (input.drift ? 1.3 : 1) *
    (speed < -1 ? -1 : 1);
  c.angle += yaw;
  // Redirect momentum with the tires instead of deleting speed on every turn.
  // The handbrake leaves more momentum sideways, making controlled slides possible.
  const gripYaw = yaw * (input.drift ? 0.2 : 0.85);
  const oldX = c.vx;
  c.vx = c.vx * Math.cos(gripYaw) - c.vz * Math.sin(gripYaw);
  c.vz = oldX * Math.sin(gripYaw) + c.vz * Math.cos(gripYaw);
  const turbo = input.boost && input.throttle > 0 && c.boost > 0;
  c.boost = clamp(c.boost + (turbo ? -25 : 22) * dt, 0, 100);
  const ax = Math.sin(c.angle),
    az = -Math.cos(c.angle);
  const braking = speed * input.throttle < -1;
  const acceleration = dashing ? 0 : braking ? 38 : turbo ? 30 : 20;
  c.vx += ax * input.throttle * acceleration * dt;
  c.vz += az * input.throttle * acceleration * dt;
  const side = c.vx * Math.cos(c.angle) + c.vz * Math.sin(c.angle);
  const lateralGrip = dashing ? 0 : Math.min(1, dt * (input.drift ? 1.5 : 12));
  c.vx -= Math.cos(c.angle) * side * lateralGrip;
  c.vz -= Math.sin(c.angle) * side * lateralGrip;
  const drag = Math.exp(-dt * 0.65);
  c.vx *= drag;
  c.vz *= drag;
  const max = turbo || dashing ? 23 : 16,
    mag = Math.hypot(c.vx, c.vz);
  if (mag > max) {
    // Ease down after releasing boost; no abrupt speed clamp.
    const limited = Math.max(max, mag - 24 * dt);
    c.vx *= limited / mag;
    c.vz *= limited / mag;
  }
  c.vy -= 24 * dt;
  c.y = Math.max(0, c.y + c.vy * dt);
  if (c.y === 0) {
    c.vy = 0;
    c.airTime = 0;
    c.dashUsed = false;
    c.dashTime = 0;
    c.dashHit = false;
  } else c.airTime += dt;
  c.x += c.vx * dt;
  c.z += c.vz * dt;
  if (Math.abs(c.x) > 19.5) {
    c.x = clamp(c.x, -19.5, 19.5);
    c.vx *= -0.4;
  }
  if (Math.abs(c.z) > 30.5) {
    c.z = clamp(c.z, -30.5, 30.5);
    c.vz *= -0.4;
  }
  if(Math.abs(c.x)>17&&Math.abs(c.z)>28){
    const cx=Math.sign(c.x)*17,cz=Math.sign(c.z)*28;
    const dx=c.x-cx,dz=c.z-cz,d=Math.hypot(dx,dz);
    if(d>2.8){
      c.x=cx+dx/d*2.8;c.z=cz+dz/d*2.8;
      const outward=(c.vx*dx+c.vz*dz)/d;
      if(outward>0){c.vx-=dx/d*outward*1.35;c.vz-=dz/d*outward*1.35;}
    }
  }
  return turbo;
}
export { makeBall, hitBall, stepBall } from "./ball.js";
