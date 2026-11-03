// Node check of the serverless signalling in src/stages/coop/net.ts (code encode/decode + offer/answer/accept + messages),
// using node-datachannel's RTCPeerConnection polyfill (libdatachannel). Not a substitute for two real phones.
//   (cd /tmp/ndc && npm i node-datachannel) ; NODE_PATH=/tmp/ndc/node_modules npx tsx tools/coop-net-test.ts
import { createRequire } from 'node:module';
const req = createRequire('/tmp/ndc/');
const poly = req('node-datachannel/polyfill');
Object.assign(globalThis, { RTCPeerConnection: poly.RTCPeerConnection, RTCSessionDescription: poly.RTCSessionDescription, RTCIceCandidate: poly.RTCIceCandidate });
const { Link, decode } = await import('../src/stages/coop/net');
const A = new Link(false), B = new Link(false);
const offer = await A.offer(); console.log('offer code', offer.length, 'chars');
const answer = await B.answer(`https://x.github.io/jelly-gift/coop/#${offer}`); console.log('answer code', answer.length, 'chars');
console.log((await decode(answer)).sdp.split('\n').filter(l => l.startsWith('a=candidate')).length, 'candidates in answer');
const got: unknown[] = [];
B.onMsg = m => got.push(m);
await new Promise<void>((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), 10000); A.onOpen = () => { clearTimeout(t); res(); }; void A.accept(answer); });
A.send({ k: 's', s: [1, 2, 3] }); await new Promise(r => setTimeout(r, 500));
console.log('open:', A.open, B.open, 'received:', JSON.stringify(got));
A.close(); B.close(); process.exit(0);
