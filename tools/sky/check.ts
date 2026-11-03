import * as A from 'astronomy-engine';
import { SKY } from '../../src/stages/sky/config.ts';
import { zoned, eqjToHor, rot, radec, altDeg, azDeg, refract } from '../../src/stages/sky/astro.ts';
const t = zoned('2026-11-18', '21:00', SKY.place.tz), m = eqjToHor(t, SKY.place), o = new A.Observer(SKY.place.lat, SKY.place.lon, 10);
for (const [n, ra, de] of [['Vega', 279.2347, 38.7837], ['Altair', 297.6958, 8.8683], ['Capella', 79.1723, 45.998]] as const) {
  const v = refract(rot(m, radec(ra, de)));
  // independent: precess J2000->of-date via astronomy-engine, then Horizon()
  const eqd = A.RotateVector(A.Rotation_EQJ_EQD(t), A.VectorFromSphere(new A.Spherical(de, ra, 1), t));
  const sp = A.EquatorFromVector(eqd); const h = A.Horizon(t, o, sp.ra, sp.dec, 'normal');
  console.log(n, altDeg(v).toFixed(3), azDeg(v).toFixed(3), '| Horizon():', h.altitude.toFixed(3), h.azimuth.toFixed(3));
}
