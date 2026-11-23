import assert from "node:assert/strict";
import test from "node:test";

import { dist, generateCourse, surfaceAt, todayEastern } from "./course.ts";
import { defaultAim, parseToPar, puttsFor, simulateShot } from "./shot.ts";

test("same date gives the same course, different dates differ", () => {
  const a = generateCourse("2026-11-22");
  const b = generateCourse("2026-11-22");
  const c = generateCourse("2026-11-23");
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("every course is nine holes, par 36, with a playable tee and green", () => {
  for (let d = 1; d <= 60; d++) {
    const date = `2026-${String(Math.ceil(d / 28)).padStart(2, "0")}-${String(((d - 1) % 28) + 1).padStart(2, "0")}`;
    const course = generateCourse(date);
    assert.equal(course.holes.length, 9);
    assert.equal(course.par, 36);
    for (const h of course.holes) {
      assert.equal(surfaceAt(h, h.tee), "tee", `${date} hole ${h.number} tee`);
      assert.equal(surfaceAt(h, h.pin), "green", `${date} hole ${h.number} pin`);
    }
  }
});

test("a pure full-power shot at the pin from range finds the hole area", () => {
  const course = generateCourse("2026-11-22");
  const par3 = course.holes.find((h) => h.par === 3)!;
  const calm = { ...par3, wind: { x: 0, y: 0 } };
  const r = simulateShot({ hole: calm, ball: calm.tee, lie: "tee", aim: calm.pin, power: 1, error: 0 });
  assert.ok(r.pure);
  assert.ok(dist(r.landing, calm.pin) < 1, "lands on the pin with no wind");
});

test("a late strike pushes right of the target", () => {
  const course = generateCourse("2026-11-22");
  const h = { ...course.holes[0], wind: { x: 0, y: 0 }, ponds: [], burns: [], bunkers: [] };
  const aim = defaultAim(h, h.tee, "tee");
  const r = simulateShot({ hole: h, ball: h.tee, lie: "tee", aim, power: 1, error: -15 });
  const dir = { x: aim.x - h.tee.x, y: aim.y - h.tee.y };
  const off = { x: r.landing.x - h.tee.x, y: r.landing.y - h.tee.y };
  // Cross product < 0 means the landing is to the right of the aim line.
  assert.ok(dir.x * off.y - dir.y * off.x < 0);
});

test("putt rings", () => {
  const h = generateCourse("2026-11-22").holes[0];
  assert.equal(puttsFor(h, { x: h.pin.x + 2, y: h.pin.y }), 1);
  assert.equal(puttsFor(h, { x: h.pin.x + 6, y: h.pin.y }), 2);
  assert.equal(puttsFor(h, { x: h.pin.x + 12, y: h.pin.y }), 3);
});

test("challenge score parsing", () => {
  assert.equal(parseToPar("-5"), -5);
  assert.equal(parseToPar("3"), 3);
  assert.equal(parseToPar("E"), 0);
  assert.equal(parseToPar("junk"), null);
  assert.equal(parseToPar(null), null);
});

test("today is a YYYY-MM-DD string", () => {
  assert.match(todayEastern(new Date("2026-11-23T03:00:00Z")), /^2026-11-22$/);
});
