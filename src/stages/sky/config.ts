// /sky/ configuration — THE ONLY PLACE to put the real date + place. Everything on the page is computed from these.
// ⚠ PLACEHOLDERS (waiting for lotus): start date, city, coordinates, clock time.
//   Default start 2026-04-18 → 2026-11-03 is day 200 (day 1 = the start date itself; 2026-11-03 − 2026-04-18 = 199 days).
export const SKY = {
  /** ⚠ PLACEHOLDER: the day you got together (day 1), local calendar date */
  start: '2026-04-18',
  /** which anniversary day to compare with (day N = start + N−1 days) */
  dayN: 200,
  /** ⚠ PLACEHOLDER: local clock time for both skies (HH:MM) */
  time: '21:00',
  /** ⚠ PLACEHOLDER: the city (same for both days unless `placeN` is set) */
  place: { zh: '上海', en: 'Shanghai', lat: 31.23, lon: 121.47, height: 10, tz: 'Asia/Shanghai' },
  /** optional: a different place for day N (e.g. if you were apart) — null = same as `place` */
  placeN: null as null | { zh: string; en: string; lat: number; lon: number; height: number; tz: string },
  /** "same sky again" search horizon (years) and match thresholds */
  search: { years: 300, starDeg: 1.0, moonDeg: 3.0, moonFrac: 0.03 },
};
export type Place = typeof SKY.place;
