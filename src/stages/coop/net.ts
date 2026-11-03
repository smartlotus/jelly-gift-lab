// Serverless two-phone link: WebRTC DataChannel, signalling by QR code (no server, nothing leaves the two phones).
//   host: offer() -> code (shown as a QR / URL)        guest: answer(offerCode) -> code (shown as a QR)
//   host: accept(answerCode) -> channel opens on both sides.
// Same Wi-Fi: host (mDNS/LAN) candidates connect directly, no STUN needed. Different networks: optional STUN servers that are
// usually reachable from mainland China (unverified, may change) - never Google's. Symmetric NAT (some 4G) needs TURN = a
// server, deliberately not used -> "same Wi-Fi or one-phone mode".
export const STUN = ['stun:stun.miwifi.com:3478', 'stun:stun.qq.com:3478'];
const GATHER_MS = 2600;

// ---- code <-> SDP (trimmed + deflate-raw + base64url; 'r' prefix = uncompressed fallback) ----
const b64u = (b: Uint8Array) => { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s: string) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(t, c => c.charCodeAt(0)); };
async function pipe(data: Uint8Array, s: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(s)); return new Uint8Array(await out.arrayBuffer());
}
/** drop what a data-channel-only connection does not need (TCP candidates, extmap etc.) to keep the QR small */
export function trimSdp(sdp: string) {
  return sdp.split(/\r?\n/).filter(l => l && !/^a=candidate:.* tcp /i.test(l) && !/^a=(extmap|msid-semantic|ice-options:trickle$)/.test(l)).join('\r\n') + '\r\n';
}
export async function encode(kind: 'o' | 'a', sdp: string): Promise<string> {
  const raw = new TextEncoder().encode(trimSdp(sdp));
  if (typeof CompressionStream !== 'undefined') { try { return kind + 'z' + b64u(await pipe(raw, new CompressionStream('deflate-raw'))); } catch { /* */ } }
  return kind + 'r' + b64u(raw);
}
export async function decode(code: string): Promise<{ kind: 'o' | 'a'; sdp: string }> {
  code = code.trim(); const m = code.match(/[#&?]([oa][zr][\w-]+)/); if (m) code = m[1]; // a URL (…/coop/#oz…) or a bare code
  const kind = code[0] as 'o' | 'a', z = code[1] === 'z', bytes = unb64u(code.slice(2));
  if (kind !== 'o' && kind !== 'a') throw new Error('bad code');
  return { kind, sdp: new TextDecoder().decode(z ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes) };
}

export class Link {
  pc: RTCPeerConnection; ch: RTCDataChannel;
  onOpen = () => {}; onClose = () => {}; onMsg: (m: unknown) => void = () => {};
  open = false;
  constructor(stun = true) {
    this.pc = new RTCPeerConnection({ iceServers: stun ? [{ urls: STUN }] : [] });
    // negotiated channel: both sides create it with the same id, no ondatachannel round trip
    this.ch = this.pc.createDataChannel('duo', { negotiated: true, id: 0, ordered: true });
    this.ch.onopen = () => { this.open = true; this.onOpen(); };
    this.ch.onclose = () => { if (this.open) { this.open = false; this.onClose(); } };
    this.ch.onmessage = e => { try { this.onMsg(JSON.parse(e.data)); } catch { /* */ } };
    this.pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(this.pc.connectionState) && this.open) { this.open = false; this.onClose(); } };
  }
  send(m: unknown) { if (this.open && this.ch.readyState === 'open') this.ch.send(JSON.stringify(m)); }
  private gathered(): Promise<void> {
    return new Promise(res => {
      if (this.pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, GATHER_MS); // unreachable STUN must not block: LAN candidates are already in
      this.pc.addEventListener('icegatheringstatechange', () => { if (this.pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  async offer(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer()); await this.gathered();
    return encode('o', this.pc.localDescription!.sdp);
  }
  async answer(offerCode: string): Promise<string> {
    const o = await decode(offerCode); if (o.kind !== 'o') throw new Error('not an offer');
    await this.pc.setRemoteDescription({ type: 'offer', sdp: o.sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer()); await this.gathered();
    return encode('a', this.pc.localDescription!.sdp);
  }
  async accept(answerCode: string) {
    const a = await decode(answerCode); if (a.kind !== 'a') throw new Error('not an answer');
    await this.pc.setRemoteDescription({ type: 'answer', sdp: a.sdp });
  }
  close() { try { this.ch.close(); this.pc.close(); } catch { /* */ } }
}
