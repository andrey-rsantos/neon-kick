import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCar, drive, hitBall, DASH_DURATION } from "../src/physics.js";

const idle = { throttle: 0, steer: 0, jump: false, boost: false };
function advance(c, count, input = idle) {
  for (let i = 0; i < count; i++) drive(c, input, 1 / 120);
}
function jump(c) {
  advance(c, 1, { ...idle, jump: true });
  advance(c, 12);
}
function dash(c, direction = {}) {
  advance(c, 1, { ...idle, ...direction, jump: true });
}

test("segurar pulo não ativa dash; segundo toque ativa sem gastar turbo", () => {
  const c = makeCar(0);
  advance(c, 15, { ...idle, jump: true });
  assert.equal(c.dashTime, 0);
  advance(c, 1);
  dash(c);
  assert.equal(c.dashUsed, true);
  assert.equal(c.dashTime, DASH_DURATION);
  assert.ok(c.vz < -7);
  assert.equal(c.boost, 100);
});
test("dash lateral e diagonal seguem a orientação do carro", () => {
  const side = makeCar(0);
  jump(side);
  dash(side, { steer: 1 });
  assert.ok(side.vx > 7);
  assert.ok(Math.abs(side.vz) < 0.01);
  advance(side, 12);
  assert.ok(side.vx > 6); // No tire friction while dodging sideways.
  const diagonal = makeCar(0, Math.PI / 2);
  jump(diagonal);
  dash(diagonal, { throttle: 1, steer: 1 });
  assert.ok(diagonal.vx > 5 && diagonal.vz > 5);
  assert.ok(Math.hypot(diagonal.vx, diagonal.vz) < 8.01);
});
test("não permite dash extra no ar; pousar libera o próximo", () => {
  const c = makeCar(0);
  jump(c);
  dash(c);
  advance(c, 2);
  const remaining = c.dashTime;
  dash(c);
  assert.ok(c.dashTime < remaining);
  advance(c, 120);
  assert.equal(c.y, 0);
  assert.equal(c.dashUsed, false);
  jump(c);
  dash(c);
  assert.equal(c.dashTime, DASH_DURATION);
});
test("janela expirada e velocidade máxima preservam o balanceamento", () => {
  const c = makeCar(0);
  jump(c);
  advance(c, 67);
  dash(c);
  assert.equal(c.dashTime, 0);
  const fast = makeCar(0);
  jump(fast);
  fast.vz = -23;
  dash(fast, { throttle: 1 });
  assert.ok(Math.hypot(fast.vx, fast.vz) <= 23);
  advance(fast, 120);
  assert.ok(Math.hypot(fast.vx, fast.vz) <= 16);
});
test("dash dá força extra só no primeiro contato válido e respeita limite da bola", () => {
  const c = makeCar(0);
  jump(c);
  dash(c);
  const normal = { ...c, dashTime: 0 };
  const ball = () => ({
    x: c.x,
    y: c.y + 0.85,
    z: c.z - 3,
    vx: 0,
    vy: 0,
    vz: 0,
  });
  const regular = ball(),
    shot = ball();
  const regularImpulse = hitBall(normal, regular);
  const dashImpulse = hitBall(c, shot);
  assert.ok(dashImpulse > regularImpulse + 5.9);
  assert.equal(c.dashHit, true);
  assert.ok(Math.hypot(shot.vx, shot.vz) <= 28);
  const used = { ...c },
    withoutDash = { ...c, dashTime: 0 };
  assert.equal(hitBall(used, ball()), hitBall(withoutDash, ball()));
});
