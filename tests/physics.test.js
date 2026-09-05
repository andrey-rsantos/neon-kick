import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCar, drive, hitBall, stepBall } from "../src/physics.js";
const input = { throttle: 1, steer: 0, boost: false, jump: false };
test("aceleração progressiva permite alinhar o primeiro toque", () => {
  const c = makeCar(20);
  for (let i = 0; i < 60; i++) drive(c, input, 1 / 120);
  const speed = Math.hypot(c.vx, c.vz);
  assert.ok(speed > 8 && speed < 10);
});
test("curvar preserva velocidade; frear responde sem esperar o arrasto", () => {
  const c = makeCar(0);
  c.vz = -14;
  for (let i = 0; i < 40; i++)
    drive(c, { ...input, throttle: 0, steer: 1 }, 1 / 120);
  assert.ok(c.angle > 0.6 && c.angle < 0.8);
  assert.ok(Math.hypot(c.vx, c.vz) > 10.5);
  assert.ok(c.vx > 6);
  const braking = makeCar(0);
  braking.vz = -16;
  for (let i = 0; i < 42; i++)
    drive(braking, { ...input, throttle: -1 }, 1 / 120);
  assert.ok(Math.abs(braking.vz) < 4);
});
test("turbo termina gradualmente e bola não ganha velocidade ilimitada", () => {
  const c = makeCar(0);
  c.vz = -23;
  drive(c, { ...input, throttle: 0 }, 1 / 120);
  assert.ok(Math.abs(c.vz) > 22);
  const b = { x: 0, y: 1.3, z: -2, vx: 0, vy: 0, vz: 0 };
  c.vz = -100;
  hitBall(c, b);
  assert.ok(Math.hypot(b.vx, b.vz) <= 28.00001);
});
test("aceleração, turbo e limites da arena", () => {
  const c = makeCar(20);
  for (let i = 0; i < 120; i++) drive(c, input, 1 / 120);
  assert.ok(c.z < 13);
  const regular = Math.hypot(c.vx, c.vz);
  for (let i = 0; i < 60; i++) drive(c, { ...input, boost: true }, 1 / 120);
  assert.ok(Math.hypot(c.vx, c.vz) > regular);
  assert.ok(c.boost < 100);
  for (let i = 0; i < 1500; i++) drive(c, input, 1 / 120);
  assert.ok(Math.abs(c.z) <= 30.5);
});
test("batida transfere impulso e levanta a bola", () => {
  const c = makeCar(3);
  c.vz = -20;
  const b = { x: 0, y: 1.3, z: 0, vx: 0, vy: 0, vz: 0 };
  assert.ok(hitBall(c, b) > 20);
  assert.ok(b.vz < -20);
  assert.ok(b.vy > 2 && b.vy < 6);
});
test("toque leve mantém a bola baixa e próxima para driblar", () => {
  const c = makeCar(0);
  c.vz = -5;
  const b = { x: 0, y: 1.3, z: -3, vx: 0, vy: 0, vz: 0 };
  hitBall(c, b);
  const start = b.z;
  let peak = b.y;
  for (let i = 0; i < 120; i++) {
    stepBall(b, 1 / 120);
    peak = Math.max(peak, b.y);
  }
  assert.ok(peak < 1.5);
  assert.ok(start - b.z > 2 && start - b.z < 5);
});
test("colisão acompanha o para-choque e a largura da carroceria", () => {
  const c = makeCar(0);
  c.vz = -15;
  const front = { x: 0, y: 1.3, z: -3, vx: 0, vy: 0, vz: 0 };
  assert.ok(hitBall(c, front) > 0);
  const side = { x: 2.5, y: 1.3, z: 0, vx: 0, vy: 0, vz: 0 };
  assert.equal(hitBall(c, side), 0);
});
test("bola quica e permanece em estado finito", () => {
  const b = { x: 18, y: 8, z: 0, vx: 15, vy: 0, vz: 8 };
  for (let i = 0; i < 6000; i++) {
    stepBall(b, 1 / 120);
    assert.ok(Object.values(b).every(Number.isFinite));
    assert.ok(b.y >= 1.3);
    assert.ok(Math.abs(b.x) <= 19.7);
  }
  assert.ok(Math.abs(b.vx) < 1);
});
test("gols nos dois lados; bola alta e fora da abertura não contam", () => {
  for (const sign of [-1, 1]) {
    const b = { x: 0, y: 2, z: sign * 33.4, vx: 0, vy: 0, vz: sign * 5 };
    assert.equal(stepBall(b, 1 / 120), sign < 0 ? 0 : 1);
  }
  for (const [x, y] of [
    [9, 2],
    [0, 7],
  ]) {
    const b = { x, y, z: -31, vx: 0, vy: 0, vz: -10 };
    assert.equal(stepBall(b, 1 / 120), -1);
    assert.ok(b.vz > 0);
  }
});
test("pulo exige soltar a tecla antes de repetir", () => {
  const c = makeCar(0);
  for (let i = 0; i < 150; i++)
    drive(c, { ...input, throttle: 0, jump: true }, 1 / 120);
  assert.equal(c.y, 0);
  drive(c, { ...input, throttle: 0, jump: false }, 1 / 120);
  drive(c, { ...input, throttle: 0, jump: true }, 1 / 120);
  assert.ok(c.y > 0);
});
