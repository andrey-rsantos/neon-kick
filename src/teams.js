import { makeCar, clamp, FIELD } from "./physics.js";

const HALF_W = FIELD.width / 2;
const HALF_L = FIELD.length / 2;
const HALF_GOAL = FIELD.goal / 2;

export function makeRoster(size = 1) {
  const count = clamp(Math.round(size), 1, 3),
    cars = [];
  for (let team = 0; team < 2; team++)
    for (let slot = 0; slot < count; slot++) {
      cars.push({
        ...makeCar(0),
        id: `${team}-${slot}`,
        team,
        slot,
        human: team === 0 && slot === 0,
        role: "support",
      });
    }
  resetRoster(cars);
  return cars;
}
export function resetRoster(cars) {
  const formation = [
    [-4, 18],
    [7, 23],
    [-7, 27],
  ];
  for (const c of cars) {
    const sign = c.team === 0 ? 1 : -1,
      [x, z] = formation[c.slot];
    Object.assign(c, makeCar(z * sign), {
      x: x * sign,
      angle: Math.atan2(-x * sign, z * sign),
      turbo: false,
      role: c.slot === 0 ? "attack" : c.slot === 1 ? "support" : "defend",
    });
  }
}
export function assignRoles(cars, ball) {
  for (const team of [0, 1]) {
    const members = cars.filter((c) => c.team === team),
      attack = team === 0 ? -1 : 1;
    const cost = (c) =>
      Math.hypot(c.x - ball.x, c.z - ball.z) +
      (c.z * attack > ball.z * attack + 1 ? 6 : 0) -
      (c.role === "attack" ? 2.5 : 0);
    members.sort((a, b) => cost(a) - cost(b));
    members.forEach(
      (c, i) => (c.role = i === 0 ? "attack" : i === 1 ? "support" : "defend"),
    );
  }
}
// Rough short-horizon lead: the ball bleeds speed to rolling/air resistance,
// approximated as gentle exponential decay rather than replaying full physics.
function predictBall(ball, t) {
  const damp = Math.exp(-0.5 * t);
  return { x: ball.x + ball.vx * t * damp, z: ball.z + ball.vz * t * damp };
}
function travelTime(c, x, z) {
  return Math.hypot(x - c.x, z - c.z) / 13;
}
// Earliest point along the ball's predicted path a car can actually reach first;
// falls back to the farthest lead point when nothing is catchable in time.
function interceptBall(c, ball) {
  let best = { x: ball.x, z: ball.z };
  for (let t = 0.1; t <= 1.4; t += 0.1) {
    best = predictBall(ball, t);
    if (travelTime(c, best.x, best.z) <= t) break;
  }
  return best;
}
export function botInput(c, ball, cars, difficulty = "normal") {
  const attack = c.team === 0 ? -1 : 1,
    casual = difficulty === "casual";
  const distance = Math.hypot(c.x - ball.x, c.z - ball.z);
  let tx, tz, dangerNow = false, wantsDash = false;
  if (c.role === "attack") {
    // Predict only when there's real ground to cover; up close, chase the
    // actual ball so control doesn't wobble on a noisy short-range forecast.
    const lead = distance < 8 ? { x: ball.x, z: ball.z } : interceptBall(c, ball);
    const bx = lead.x,
      bz = lead.z;
    // Default approach is straight from behind, along z only (like lining up
    // a run-up) — that stays on the pitch no matter how wide the ball is.
    let ax = 0,
      az = attack;
    // A straight strike from a tight angle near the sideline rarely beats the
    // keeper; bank it off the near wall by aiming at the goal's mirror image.
    // Kept a margin off the wall itself so the approach point stays in bounds.
    if (
      Math.abs(bx) > HALF_W - 8 &&
      Math.abs(bx) < HALF_W - 4 &&
      bz * attack > HALF_L * 0.5 &&
      Math.abs(bz * attack) < HALF_L - 8
    ) {
      const wallX = (Math.sign(bx) || 1) * (HALF_W - 1.2);
      const goalX = 2 * wallX,
        goalZ = attack * HALF_L;
      const gx = goalX - bx,
        gz = goalZ - bz,
        glen = Math.hypot(gx, gz) || 1;
      ax = gx / glen;
      az = gz / glen;
    }
    // Already upfield of the ball: ramming through now would shove it the wrong
    // way, so swing out to the side and come back around onto the right line.
    if (c.z * attack > bz * attack - 1) {
      tx = bx + (c.x > bx ? 5 : -5);
      tz = bz - attack * 6;
    } else if (distance < 7) {
      tx = bx * 0.94;
      tz = bz + attack * 2.5;
    } else {
      tx = bx - ax * 3.4;
      tz = bz - az * 3.4;
    }
    const ballDelta = Math.atan2(ball.x - c.x, -(ball.z - c.z)) - c.angle;
    const aimed =
      Math.abs(Math.atan2(Math.sin(ballDelta), Math.cos(ballDelta))) < 0.25;
    wantsDash = !casual && ball.y < 2.2 && aimed && distance > 1.3 && distance < 3.6;
  } else if (c.role === "defend") {
    const ownGoalZ = -attack * HALF_L;
    const incoming = ball.vz * -attack; // > 0 while the ball is heading at our own goal
    const ballU = ball.z * attack; // more negative the deeper it is in our own half
    // Only step out for a ball that is both genuinely dangerous and close enough
    // that this defender - not a teammate upfield - is the one who should meet it.
    dangerNow = incoming > 4 && ballU < -HALF_L * 0.35 && distance < 14;
    if (dangerNow) {
      // Close range: react to where the ball actually is, not a shared forecast
      // the attacker/support may already be converging on.
      tx = ball.x;
      tz = ball.z;
      const ballDelta = Math.atan2(ball.x - c.x, -(ball.z - c.z)) - c.angle;
      const aimed =
        Math.abs(Math.atan2(Math.sin(ballDelta), Math.cos(ballDelta))) < 0.25;
      wantsDash =
        !casual && ball.y < 2.2 && aimed && distance > 1.3 && distance < 3.6;
    } else {
      tx = clamp(ball.x * 0.45, -6, 6);
      tz = ownGoalZ + attack * 6;
    }
  } else {
    const lead = predictBall(ball, 0.3);
    const ownHalf = lead.z * attack < 0;
    tx = ownHalf
      ? lead.x * 0.4
      : clamp(lead.x + (lead.x >= 0 ? -8 : 8), -14, 14);
    tz = clamp(lead.z - attack * 11, -24, 24);
  }
  // Stay out of the active teammate's approach lane.
  for (const ally of cars) {
    if (ally === c || ally.team !== c.team) continue;
    const dx = c.x - ally.x,
      dz = c.z - ally.z,
      d = Math.hypot(dx, dz);
    if (d < 4.5 && d > 0.01) {
      tx += (dx / d) * (4.5 - d);
      tz += (dz / d) * (4.5 - d);
    }
  }
  tx = clamp(tx, -(HALF_W - 2), HALF_W - 2);
  tz = clamp(tz, -(HALF_L - 2), HALF_L - 2);
  const targetDistance = Math.hypot(tx - c.x, tz - c.z);
  let delta = Math.atan2(tx - c.x, -(tz - c.z)) - c.angle;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  const forwardSpeed = c.vx * Math.sin(c.angle) - c.vz * Math.cos(c.angle);
  const attacking = c.role === "attack" || dangerNow;
  const targetSpeed = Math.min(
    Math.abs(delta) > 1 ? 5 : distance < 8 ? 9 : casual ? 11 : 14,
    attacking ? Math.max(5, targetDistance * 2) : targetDistance * 2,
  );
  const throttle =
    forwardSpeed > targetSpeed + 0.5
      ? -0.35
      : targetDistance < 0.8 && c.role !== "attack" && !dangerNow
        ? 0
        : casual
          ? 0.5
          : 0.65;
  // A short jump-then-dash chains a grounded hop into a flick: hold the first
  // press, release for a frame to arm it, then re-press to fire the dodge.
  const aerial = attacking && ball.y > 2.5 && distance < 3.5;
  let jump = false;
  if (c.y === 0) {
    if (aerial) {
      jump = true;
      c.aiDashIntent = false;
    } else if (wantsDash) {
      jump = true;
      c.aiDashIntent = true;
    } else {
      c.aiDashIntent = false;
    }
  } else if (c.aiDashIntent && !c.dashUsed && c.airTime < 0.55) {
    jump = c.jumpReady;
  }
  return {
    throttle,
    steer: clamp(delta * 1.8, -1, 1),
    boost:
      !casual &&
      Math.abs(delta) < 0.2 &&
      forwardSpeed < targetSpeed - 1 &&
      targetDistance > (dangerNow ? 6 : c.role === "support" ? 12 : 22) &&
      c.boost > 12,
    jump,
    drift: false,
  };
}
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++)
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i],
        b = cars[j],
        dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz);
      if (d >= 2.2 || Math.abs(a.y - b.y) >= 1.2) continue;
      const nx = d > 0.001 ? dx / d : 1,
        nz = d > 0.001 ? dz / d : 0,
        over = (2.2 - d) * 0.5;
      a.x -= nx * over;
      a.z -= nz * over;
      b.x += nx * over;
      b.z += nz * over;
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (closing > 0) {
        const impulse = closing * 0.55;
        a.vx -= nx * impulse;
        a.vz -= nz * impulse;
        b.vx += nx * impulse;
        b.vz += nz * impulse;
      }
    }
}
