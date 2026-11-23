import assert from "node:assert/strict";
import test from "node:test";

import { dist, generateCourse, heightAt, surfaceAt, todayEastern, type Hole } from "./course.ts";
import { CLUBS, clubFor, defaultTarget, launchSpeed, simulatePutt, simulateShot } from "./physics.ts";
import { parseToPar } from "./scoring.ts";

const calm = (h: Hole): Hole => ({ ...h, wind: { x: 0, y: 0 }, gusts: [] });

test("same date gives the same course, different dates differ", () => {
  assert.deepEqual(generateCourse("2026-11-22"), generateCourse("2026-11-22"));
  assert.notDeepEqual(generateCourse("2026-11-22"), generateCourse("2026-11-23"));
});

test("every course is nine holes, par 36, with a playable tee and green", () => {
  for (let d = 1; d <= 40; d++) {
    const date = `2026-${String(Math.ceil(d / 28)).padStart(2, "0")}-${String(((d - 1) % 28) + 1).padStart(2, "0")}`;
    const course = generateCourse(date);
    assert.equal(course.holes.length, 9);
    assert.equal(course.par, 36);
    for (const h of course.holes) {
      assert.equal(surfaceAt(h, h.tee), "tee", `${date} hole ${h.number} tee`);
      assert.equal(surfaceAt(h, h.pin), "green", `${date} hole ${h.number} pin`);
      assert.ok(Number.isFinite(heightAt(h, h.pin.x, h.pin.y)));
    }
  }
});

test("launch solver: still-air flat carry matches the aimed distance", () => {
  for (const c of CLUBS) {
    const v = launchSpeed(c.max, c.loft);
    assert.ok(v > 5 && v < 249, `${c.name} speed ${v}`);
  }
});

test("a pure shot in still air lands near the target", () => {
  const h = calm(generateCourse("2026-11-22").holes.find((x) => x.par === 3)!);
  const d = dist(h.tee, h.pin);
  const club = clubFor(d, "tee");
  const heading = Math.atan2(h.pin.x - h.tee.x, h.pin.y - h.tee.y);
  const r = simulateShot({ hole: h, start: h.tee, lie: "tee", heading, distance: d, club, power: 1, error: 0, rand: () => 0.5 });
  assert.ok(r.pure);
  // Elevation changes carry, so allow some slack.
  assert.ok(Math.abs(r.carry - d) < 25, `carry ${r.carry} vs ${d}`);
});

test("a late strike finishes right of the line, an early one left", () => {
  const h = calm(generateCourse("2026-11-22").holes.find((x) => x.par === 4)!);
  const { heading, distance } = defaultTarget(h, h.tee, "tee");
  const club = clubFor(distance, "tee");
  const side = (error: number) => {
    const r = simulateShot({ hole: h, start: h.tee, lie: "tee", heading, distance, club, power: 1, error, rand: () => 0.5 });
    const land = r.frames[r.landingIndex];
    const dx = land.x - h.tee.x;
    const dy = land.y - h.tee.y;
    return Math.sin(heading) * dy - Math.cos(heading) * dx; // > 0 means left of the line
  };
  assert.ok(side(-12) < -5, "late goes right");
  assert.ok(side(12) > 5, "early goes left");
});

test("a putt hit at the hole with the right pace on a flat green drops", () => {
  const base = generateCourse("2026-11-22").holes[0];
  const flat: Hole = { ...base, greenTilt: { x: 0, y: 0 }, greenBump: 0, noiseAmp: 0, moundHeight: 0, teeHeight: 0, greenHeight: 0, bunkers: [], ponds: [] };
  const start = { x: flat.pin.x, y: flat.pin.y - 6 };
  const r = simulatePutt({ hole: flat, start, heading: 0, distance: 6, power: 1, rand: () => 0.5 });
  assert.equal(r.outcome.kind, "holed");
  const weak = simulatePutt({ hole: flat, start, heading: 0, distance: 6, power: 0.6, rand: () => 0.5 });
  assert.equal(weak.outcome.kind, "rest");
});

test("challenge score parsing", () => {
  assert.equal(parseToPar("-5"), -5);
  assert.equal(parseToPar("E"), 0);
  assert.equal(parseToPar("junk"), null);
});

test("today is computed in US Eastern", () => {
  assert.equal(todayEastern(new Date("2026-11-23T03:00:00Z")), "2026-11-22");
});

test("the 3-putt zone (outside the 2-putt ring) is less than half the green", async () => {
  const { twoPuttRadius, ONE_PUTT_R, puttsFor } = await import("./course.ts");
  for (const h of generateCourse("2026-11-22").holes) {
    const threePuttShare = 1 - (twoPuttRadius(h) / h.greenRadius) ** 2;
    assert.ok(threePuttShare < 0.5, `hole ${h.number}: ${threePuttShare}`);
    assert.ok(ONE_PUTT_R < twoPuttRadius(h));
    assert.equal(puttsFor(h, { x: h.pin.x + 1, y: h.pin.y }), 1);
    assert.equal(puttsFor(h, { x: h.pin.x + twoPuttRadius(h) - 0.2, y: h.pin.y }), 2);
    assert.equal(puttsFor(h, { x: h.pin.x + h.greenRadius - 0.2, y: h.pin.y }), 3);
  }
});
