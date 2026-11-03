// Stage 2 · Shop - the pixel cat walks through a shop of lotus's 3D models (three.js viewer) -> /night/.
// STUB: shared stub walk scene. Workstream B replaces this (docs/GIFT_PLAN.md §5.2).
import { markReached } from '../../shared/flow';
import { register } from '../../shared/i18n';
import { mountChrome, startCard } from '../../shared/chrome';
import { irisIn } from '../../shared/transition';
import { stubWalk } from '../../shared/pixel/stubwalk';
import * as dict from './dict';
import './style.css';

register(dict); mountChrome(); markReached();
void irisIn();
void startCard('shop.kicker', 'shop.title', 'shop.sub').then(() =>
  stubWalk(document.getElementById('game')!, { sky: '#f6efe4', ground: '#e6c79f', label: 'SHOP (stub) - 4 models here ->' }));
