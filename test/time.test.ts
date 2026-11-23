import { test } from "node:test";
import assert from "node:assert/strict";
import { apartLabel, cityName, dayPercent, formatClock, offsetMinutes, shortDate, wallClock } from "../client/time.js";

// A fixed moment: 22 Nov 2026, 12:00 UTC (winter, so no daylight saving in play).
const NOW = new Date("2026-11-22T12:00:00Z");

test("offsetMinutes: Lagos is UTC+1, Los Angeles is UTC-8 in winter, UTC is 0", () => {
  assert.equal(offsetMinutes("Africa/Lagos", NOW), 60);
  assert.equal(offsetMinutes("America/Los_Angeles", NOW), -480);
  assert.equal(offsetMinutes("UTC", NOW), 0);
});

test("offsetMinutes handles half-hour zones", () => {
  assert.equal(offsetMinutes("Asia/Kolkata", NOW), 330);
});

test("apartLabel: whole hours, half hours, and the same time", () => {
  assert.equal(apartLabel(60, -480), "9h apart");
  assert.equal(apartLabel(-480, 60), "9h apart");
  assert.equal(apartLabel(330, 0), "5h 30m apart");
  assert.equal(apartLabel(45, 0), "45m apart");
  assert.equal(apartLabel(60, 60), "Same time");
});

test("wallClock and dayPercent place a zone within its day", () => {
  const lagos = wallClock("Africa/Lagos", NOW);
  assert.deepEqual([lagos.hour, lagos.minute], [13, 0]);
  assert.ok(Math.abs(dayPercent("Africa/Lagos", NOW) - (13 / 24) * 100) < 0.001);
  assert.equal(dayPercent("UTC", NOW), 50);
  // Los Angeles is 04:00 -> one sixth of the way through the day.
  assert.ok(Math.abs(dayPercent("America/Los_Angeles", NOW) - (4 / 24) * 100) < 0.001);
});

test("formatClock and shortDate follow the zone", () => {
  assert.equal(formatClock("Africa/Lagos", NOW), "01:00PM");
  assert.equal(formatClock("America/Los_Angeles", NOW), "04:00AM");
  assert.equal(shortDate("Africa/Lagos", NOW), "22 Nov");
});

test("the date rolls over for zones that are already on the next day", () => {
  const late = new Date("2026-11-22T23:30:00Z");
  assert.equal(shortDate("UTC", late), "22 Nov");
  assert.equal(shortDate("Africa/Lagos", late), "23 Nov"); // 00:30 there
  assert.ok(dayPercent("Africa/Lagos", late) < 5);
});

test("cityName tidies zone names", () => {
  assert.equal(cityName("America/Los_Angeles"), "Los Angeles");
  assert.equal(cityName("Africa/Lagos"), "Lagos");
  assert.equal(cityName("UTC"), "UTC");
});
