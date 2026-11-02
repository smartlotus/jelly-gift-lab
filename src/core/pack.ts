// Tiny binary container: 'JLY1' | u32 headerLen | header JSON | 4-aligned sections.
export type TA = Float32Array | Uint32Array | Uint16Array | Int16Array | Uint8Array | Int32Array;
const CTORS: Record<string, any> = { Float32Array, Uint32Array, Uint16Array, Int16Array, Uint8Array, Int32Array };

export function packSections(meta: any, sections: Record<string, TA>): Uint8Array {
  const enc = new TextEncoder();
  const desc: Record<string, { type: string; offset: number; length: number }> = {};
  let off = 0;
  for (const [k, v] of Object.entries(sections)) {
    desc[k] = { type: v.constructor.name, offset: off, length: v.length };
    off += Math.ceil(v.byteLength / 4) * 4;
  }
  const hdr = enc.encode(JSON.stringify({ meta, sections: desc }));
  const hlen = Math.ceil(hdr.length / 4) * 4;
  const out = new Uint8Array(8 + hlen + off);
  out.set(enc.encode('JLY1'), 0);
  new DataView(out.buffer).setUint32(4, hlen, true);
  out.fill(32, 8, 8 + hlen);
  out.set(hdr, 8);
  for (const [k, v] of Object.entries(sections)) {
    out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), 8 + hlen + desc[k].offset);
  }
  return out;
}

export function unpackSections(buf: ArrayBuffer): { meta: any; s: Record<string, any> } {
  const u8 = new Uint8Array(buf);
  const magic = new TextDecoder().decode(u8.subarray(0, 4));
  if (magic !== 'JLY1') throw new Error('bad asset');
  const hlen = new DataView(buf).getUint32(4, true);
  const hdr = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + hlen)));
  const s: Record<string, any> = {};
  for (const [k, d] of Object.entries<any>(hdr.sections)) {
    const C = CTORS[d.type];
    s[k] = new C(buf, 8 + hlen + d.offset, d.length);
  }
  return { meta: hdr.meta, s };
}
