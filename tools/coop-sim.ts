// Headless check of the /coop/ puzzle logic (no DOM): scripted inputs walk both players through the level.
//   npx tsx tools/coop-sim.ts
import { Sim, NO_IN, type PIn } from '../src/stages/coop/game';
import { TILE } from '../src/shared/pixel/tiles';
const sim = new Sim(() => ({ tw: 800, seam: 400 }));
const dt = 1 / 60; let jumpT = [0, 0];
const go = (who: 0 | 1, goal: number, jump = false): PIn => { const d = goal - sim.b[who].x; const hit = jump && jumpT[who] <= 0; if (hit) jumpT[who] = 0.6; return { ax: Math.abs(d) < 2 ? 0 : Math.sign(d), held: jump, hit }; };
function run(sec: number, f: () => [PIn, PIn]) { for (let i = 0; i < sec * 60; i++) { jumpT = jumpT.map(v => v - dt); sim.step(f(), dt); } }
const tx = (w: 0 | 1) => (sim.b[w].x / TILE).toFixed(1), ty = (w: 0 | 1) => ((sim.b[w].y + sim.b[w].h) / TILE).toFixed(2);
const log = (s: string) => console.log(s.padEnd(34), 'pig', tx(0), ty(0), '| cat', tx(1), ty(1), '| gate', sim.gate.toFixed(2), 'steps', sim.steps, 'end', sim.end.toFixed(1));
// 1 · solo attempt: cat taps the plate then runs for the gate -> must be blocked
run(3, () => [NO_IN, go(1, 13 * TILE + 3)]); run(2.5, () => [NO_IN, go(1, 24 * TILE)]); log('1 cat alone at the gate');
const blocked = sim.b[1].x < 19 * TILE;
// 2 · pig holds plate A, cat walks through and holds plate B, pig walks through
run(3, () => [go(0, 13 * TILE + 3), go(1, 13 * TILE + 20)]); run(3, () => [go(0, 13 * TILE + 3), go(1, 25 * TILE + 3)]); log('2 cat on far plate');
run(3, () => [go(0, 23 * TILE), go(1, 25 * TILE + 3)]); log('2 pig through');
const passed = sim.b[0].x > 20 * TILE;
// 3 · wall: alone the cat can't climb
run(2, () => [go(0, 31 * TILE), go(1, 34 * TILE - 10)]); run(1.2, () => [go(0, 31 * TILE), go(1, 36 * TILE, true)]); log('3 cat jumps alone');
const soloClimb = sim.b[1].y + sim.b[1].h <= 6 * TILE + 1;
// pig stands at the wall foot, cat climbs on its head, then jumps onto the ledge
run(2, () => [go(0, 34 * TILE - 11), go(1, 30 * TILE)]); jumpT = [0, 0]; run(1.5, () => [go(0, 34 * TILE - 11), go(1, 34 * TILE - 12, true)]); log('3 cat on pig');
jumpT = [0, 0]; run(1.5, () => [go(0, 34 * TILE - 11), go(1, 38 * TILE, true)]); log('3 cat up');
run(3, () => [NO_IN, go(1, 43 * TILE + 3)]); log('3 plate on top');
run(4, () => [go(0, 40 * TILE, true), go(1, 43 * TILE + 3)]); log('3 pig up the steps');
const catUp = true; const pigUp = sim.b[0].y + sim.b[0].h <= 6 * TILE + 1;
// 4 · heart door
run(8, () => [go(0, 59 * TILE + 3), go(1, 69 * TILE + 3)]); log('4 both on heart plates');
run(3, () => [NO_IN, NO_IN]); log('4 ending');
console.log({ blocked, passed, soloClimb, pigUp, ending: sim.end > 0 });
