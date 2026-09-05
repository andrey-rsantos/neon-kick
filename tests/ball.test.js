import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCar, makeBall, hitBall, stepBall } from "../src/physics.js";

test("bola pousa sem vibração, perde energia e para de rolar", () => {
  const b = makeBall();
  b.y = 7;
  b.vx = 9;
  for (let i = 0; i < 2400; i++) stepBall(b, 1 / 120);
  assert.equal(b.y, 1.3);
  assert.equal(b.vy, 0);
  assert.equal(b.vx, 0);
  assert.equal(b.vz, 0);
  const position = { x: b.x, z: b.z };
  for (let i = 0; i < 240; i++) stepBall(b, 1 / 120);
  assert.equal(b.x, position.x);
  assert.equal(b.z, position.z);
  assert.ok(Math.abs(Math.hypot(b.qx, b.qy, b.qz, b.qw) - 1) < 1e-8);
});
test("bola acima do carro não recebe chute fantasma; contato tangencial produz giro", () => {
  const c = makeCar(0);
  c.vz = -15;
  const high = { ...makeBall(), y: 4, z: -2 };
  assert.equal(hitBall(c, high), 0);
  const glance = { ...makeBall(), x: 1.6, z: -2.4 };
  assert.ok(hitBall(c, glance) > 0);
  assert.ok(glance.vx > 0);
  assert.ok(Math.hypot(glance.wx, glance.wy, glance.wz) > 0);
});
test("contato na trave e no travessão desvia a bola sem marcar gol", () => {
  for (const b of [
    { ...makeBall(), x: 6.8, z: -30.5, vz: -18 },
    { ...makeBall(), y: 5.8, z: -30.5, vz: -18 },
  ]) {
    let scored = -1;
    for (let i = 0; i < 30; i++) {
      const goal = stepBall(b, 1 / 120);
      if (goal >= 0) scored = goal;
    }
    assert.equal(scored, -1);
    assert.ok(b.vz > 0);
  }
});
test("gol exige bola inteira cruzando a linha, nos dois lados", () => {
  for (const sign of [-1, 1]) {
    const b = { ...makeBall(), z: sign * 32.8, vz: sign * 8 };
    assert.equal(stepBall(b, 1 / 120), -1);
    let scored = -1;
    for (let i = 0; i < 20 && scored < 0; i++) scored = stepBall(b, 1 / 120);
    assert.equal(scored, sign < 0 ? 0 : 1);
  }
});
test("subpassos conservam resultado em frames maiores", () => {
  const a = { ...makeBall(), x: 18, y: 4, vx: 20, vz: 5 },
    b = { ...a };
  stepBall(a, 1 / 30);
  for (let i = 0; i < 4; i++) stepBall(b, 1 / 120);
  for (const key of ["x", "y", "z", "vx", "vy", "vz"])
    assert.ok(Math.abs(a[key] - b[key]) < 1e-8);
});
