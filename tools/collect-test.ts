// Unit tests for the 惊喜 collection state + end-of-film routing (no browser).
//   npx tsx tools/collect-test.ts      (also: npm run test:collect)
import {
  COLLECT_KEY, TOTAL, useStore, load, markRevealed, markFound, isFound, isRevealed,
  foundList, missingList, foundCount, allFound, resetCollection, subscribe, onStorage, endRoute,
} from '../src/shared/surprise/collect';
import { STAGES } from '../src/shared/stage-list';
import { ITEMS } from '../src/shared/surprise/items';
import { SECRET_PAGE } from '../src/shared/surprise/config';

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } }
let pass = 0, fail = 0;
function ok(cond: unknown, name: string) { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } }
function fresh() { const m = new Mem(); useStore(m); return m; }

console.log('collect-test');
// basics
let mem = fresh();
ok(TOTAL === 10 && TOTAL === STAGES.length, 'one collectible per journey stage (10)');
ok(STAGES.every(id => ITEMS[id]), 'every stage has an item definition');
ok(foundCount() === 0 && !allFound(), 'empty state');
ok(JSON.stringify(endRoute()) === JSON.stringify({ kind: 'list', missing: [...STAGES] }), 'nothing found → list with all stages, in flow order');

// reveal / find
markRevealed('night');
ok(isRevealed('night') && !isFound('night'), 'reveal does not count as found');
ok(markFound('night') === true, 'first find returns true');
ok(markFound('night') === false, 'second find returns false (no double count)');
ok(isFound('night') && foundCount() === 1, 'found persists');
markFound('meadow');
ok(isRevealed('meadow'), 'find implies revealed');
ok(foundList().join() === 'meadow,night', 'foundList is in flow order');
ok(missingList().length === 8 && !missingList().includes('night'), 'missingList excludes found');

// persistence: a new "page" reads the same storage
const raw = mem.getItem(COLLECT_KEY)!;
ok(!!raw && JSON.parse(raw).v === 1, 'stored as versioned JSON under ' + COLLECT_KEY);
const m2 = new Mem(); m2.setItem(COLLECT_KEY, raw); useStore(m2);
ok(foundCount() === 2 && isFound('meadow'), 'state survives a reload (same storage, new module user)');

// robustness
useStore(mem);
mem.setItem(COLLECT_KEY, '{oops');
ok(foundCount() === 0, 'corrupt JSON → empty state, no throw');
mem.setItem(COLLECT_KEY, JSON.stringify({ v: 1, found: { night: 1, bogus: 2, sea: 'x' }, revealed: null }));
ok(foundList().join() === 'night', 'unknown ids and non-number values ignored');
ok(markFound('bogus' as never) === false, 'markFound rejects unknown stage');
useStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } });
ok(foundCount() === 0 && markFound('sea') === true, 'locked storage (private mode) does not throw');

// all found → secret
mem = fresh();
for (const id of STAGES) markFound(id);
ok(allFound() && foundCount() === TOTAL, 'all found');
ok(endRoute().kind === 'secret', 'all found → secret page');
ok(endRoute({ v: 1, found: { meadow: 1 }, revealed: {} }).kind === 'list', 'endRoute on a given state');
ok(typeof SECRET_PAGE === 'string' && SECRET_PAGE.length > 0, 'secret page url lives in config (' + SECRET_PAGE + ')');

// reset (从头再来)
let hits = 0; const off = subscribe(() => hits++);
resetCollection();
ok(foundCount() === 0 && mem.getItem(COLLECT_KEY) === null && endRoute().kind === 'list', 'reset clears everything');
markFound('sky');
ok(hits === 2, 'subscribers hear reset + find');
onStorage({ key: 'other' }); ok(hits === 2, 'storage event for other keys ignored');
onStorage({ key: COLLECT_KEY }); ok(hits === 3, 'storage event from another tab notifies');
off(); markFound('sea'); ok(hits === 3, 'unsubscribe works');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
