import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeRoster,
  resetRoster,
  assignRoles,
  botInput,
  collideCars,
} from "../src/teams.js";
import { makeBall, drive, hitBall, stepBall } from "../src/physics.js";

for (const size of [1, 2, 3])
  test(`${size}x${size}: equipes, funções e reinício coerentes`, () => {
    const cars = makeRoster(size),
      ball = makeBall();
    assert.equal(cars.length, size * 2);
    assert.equal(cars.filter((c) => c.human).length, 1);
    for (const team of [0, 1]) {
      assert.equal(cars.filter((c) => c.team === team).length, size);
    }
    assignRoles(cars, ball);
    for (const team of [0, 1])
      assert.equal(
        cars.filter((c) => c.team === team && c.role === "attack").length,
        1,
      );
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++)
        assert.ok(Math.hypot(cars[i].x - cars[j].x, cars[i].z - cars[j].z) > 4);
    cars[0].dashTime = 0.2;
    cars[0].boost = 4;
    cars[0].x = 18;
    resetRoster(cars);
    assert.equal(cars[0].dashTime, 0);
    assert.equal(cars[0].boost, 100);
    assert.equal(cars[0].x, -4);
  });
test("as duas equipes atacam em sentidos opostos e reservam defesa", () => {
  const cars = makeRoster(3),
    ball = makeBall();
  assignRoles(cars, ball);
  for (const team of [0, 1]) {
    const attack = cars.find((c) => c.team === team && c.role === "attack");
    const defender = cars.find((c) => c.team === team && c.role === "defend");
    assert.ok(defender);
    const input = botInput(attack, ball, cars);
    assert.ok(input.throttle > 0);
    assert.ok(Math.abs(input.steer) < 0.6);
    for (let i = 0; i < 60; i++)
      drive(attack, botInput(attack, ball, cars), 1 / 120);
    assert.ok(team === 0 ? attack.vz < 0 : attack.vz > 0);
  }
});
test("colisões entre todos os carros separam até posições coincidentes", () => {
  const cars = makeRoster(3);
  cars[1].x = cars[0].x;
  cars[1].z = cars[0].z;
  collideCars(cars);
  assert.ok(Math.hypot(cars[1].x - cars[0].x, cars[1].z - cars[0].z) >= 2.19);
});
test("3x3 permanece estável durante disputas, colisões e reposições", () => {
  const cars = makeRoster(3);
  let ball = makeBall(),
    goals = 0;
  for (let i = 0; i < 7200; i++) {
    if (i % 42 === 0) assignRoles(cars, ball);
    for (const c of cars) drive(c, c.human ? {throttle:0,steer:0,jump:false} : botInput(c, ball, cars), 1 / 120);
    collideCars(cars);
    for (const c of cars) hitBall(c, ball);
    const goal = stepBall(ball, 1 / 120);
    assert.ok(Object.values(ball).every(Number.isFinite));
    assert.ok(cars.every((c) => Number.isFinite(c.x) && Number.isFinite(c.z)));
    assert.ok(Math.hypot(ball.vx, ball.vz) <= 28.0001);
    if (goal >= 0) {
      goals++;
      resetRoster(cars);
      ball = makeBall();
    }
  }
  assert.ok(goals > 0, "bots devem conseguir concluir uma jogada");
});
