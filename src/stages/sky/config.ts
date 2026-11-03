// /sky/ configuration — THE ONLY PLACE to put the real date + place. Everything on the page is computed from these.
// City = Changchun (confirmed). ⚠ PLACEHOLDERS (waiting for lotus): start date (+ startIsReal), clock time of the anniversary views.
// The default view is the LIVE sky over the city right now (no date limits: the ephemeris is computed in the browser).
//   Default start 2026-04-18 → 2026-11-03 is day 200 (day 1 = the start date itself; 2026-11-03 − 2026-04-18 = 199 days).
export const SKY = {
  /** ⚠ PLACEHOLDER: the day you got together (day 1), local calendar date */
  start: '2026-04-18',
  /** which anniversary day to compare with (day N = start + N−1 days) */
  dayN: 200,
  /** ⚠ PLACEHOLDER: local clock time for the day-1 / day-N views (HH:MM) */
  time: '21:00',
  /** ⚠ PLACEHOLDER flag: set to true once `start` is the real date -> the live view then shows "第 N 天" (today's day number) */
  startIsReal: false,
  /** the city: Changchun 长春 (confirmed by lotus). Used for the live sky and both anniversary views. */
  place: { zh: '长春', en: 'Changchun', lat: 43.88, lon: 125.32, height: 220, tz: 'Asia/Shanghai' },
  /** optional: a different place for day N (e.g. if you were apart) — null = same as `place` */
  placeN: null as null | { zh: string; en: string; lat: number; lon: number; height: number; tz: string },
  /** "same sky again" search horizon (years) and match thresholds */
  search: { years: 300, starDeg: 1.0, moonDeg: 3.0, moonFrac: 0.03 },
};
export type Place = typeof SKY.place;
