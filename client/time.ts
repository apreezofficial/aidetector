// Time-zone helpers for the clock card. Pure functions, no DOM, so they can be
// tested. Each takes `now` so tests can pin the moment.

export interface WallClock {
  hour: number;
  minute: number;
  /** The zone's wall-clock reading expressed as UTC milliseconds. */
  asUtcMs: number;
}

/** The wall-clock reading in a zone at a moment. */
export function wallClock(zone: string, now: Date = new Date()): WallClock {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now)) {
    parts[p.type] = p.value;
  }
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    hour,
    minute,
    asUtcMs: Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      minute,
      Number(parts.second)
    ),
  };
}

/** Minutes the zone is ahead of UTC at that moment (Lagos = 60, Los Angeles = -480 in winter). */
export function offsetMinutes(zone: string, now: Date = new Date()): number {
  const wholeSecondMs = Math.floor(now.getTime() / 1000) * 1000;
  return Math.round((wallClock(zone, now).asUtcMs - wholeSecondMs) / 60000);
}

/** How far through its day a zone is, 0 to 100, for placing a marker on the day bar. */
export function dayPercent(zone: string, now: Date = new Date()): number {
  const w = wallClock(zone, now);
  return ((w.hour * 60 + w.minute) / 1440) * 100;
}

/** "04:49PM" in the given zone (undefined = the device's own). */
export function formatClock(zone: string | undefined, now: Date = new Date()): string {
  return now
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: zone })
    .replace(" ", "");
}

/** "22 Nov" in the given zone. */
export function shortDate(zone: string | undefined, now: Date = new Date()): string {
  return now.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: zone });
}

/** "9h apart", "5h 30m apart", or "Same time". */
export function apartLabel(offsetA: number, offsetB: number): string {
  const diff = Math.abs(offsetA - offsetB);
  if (diff === 0) return "Same time";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h ? `${h}h` : ""}${h && m ? " " : ""}${m ? `${m}m` : ""} apart`;
}

/** "America/Los_Angeles" -> "Los Angeles". */
export function cityName(zone: string): string {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}
