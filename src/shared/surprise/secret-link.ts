// How the journey reaches the secret page (SECRET_PAGE in config.ts).
import { asset, params, reducedMotion } from '../flow';
import { irisOut } from '../transition';
import { cover } from '../curtain';
import * as Sfx from '../sfx';
import { SECRET_PAGE } from './config';

/** URL of the secret page from the current page (keeps ?lang / ?sound / ?dev like the journey's own hops) */
export function secretUrl(): string {
  if (/^https?:\/\//.test(SECRET_PAGE)) return SECRET_PAGE;
  const q = new URLSearchParams();
  for (const k of ['lang', 'dev', 'sound']) { const v = params.get(k); if (v !== null) q.set(k, v); }
  q.set('from', 'home');
  return `${asset(SECRET_PAGE)}?${q}`;
}
export async function openSecret() {
  Sfx.twinkle();
  if (!reducedMotion()) await irisOut(innerWidth / 2, innerHeight / 2, 800, '#2a1e2a');
  try { await cover('secret', '#2a1e2a'); } catch { /* */ }
  location.assign(secretUrl());
}

