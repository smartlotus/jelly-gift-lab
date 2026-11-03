// Stage 1 · Meadow - bright Cat-Mario-style pixel platformer -> heart fountain -> door -> /shop/.
// STUB: shared stub walk scene. Workstream A replaces this with the real level (docs/GIFT_PLAN.md §5.1).
import { handleStageParam, markReached } from '../../shared/flow';
import { register } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { irisIn } from '../../shared/transition';
import { stubWalk } from '../../shared/pixel/stubwalk';
import * as dict from './dict';
import './style.css';

if (!handleStageParam()) {
  register(dict); mountChrome(); markReached();
  void irisIn();
  void startCard('meadow.kicker', 'meadow.title', 'meadow.sub').then(() =>
    stubWalk(document.getElementById('game')!, { sky: '#7ccfff', ground: '#5fbf4a', label: 'MEADOW (stub) - fountain + door ->' }));
}
