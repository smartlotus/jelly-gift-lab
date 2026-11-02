// Tiny GLSL -> WGSL translator for the character pattern snippets (a deliberately small, safe subset:
// float/vecN locals, vecN constructors, the shared builtins, if/else). Lets each pattern be written once.
export const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : n.toFixed(5));
export const v3 = (a: ArrayLike<number>) => `vec3(${f(a[0])}, ${f(a[1])}, ${f(a[2])})`;
export function glslBodyToWgsl(src: string) {
  return src
    .replace(/\b(float|vec2|vec3|vec4)\s+(\w+)\s*=/g, 'var $2 =')
    .replace(/\bvec([234])\(/g, 'vec$1f(');
}
/** build GLSL + WGSL twins of a function `name(args) -> vec4` from a GLSL body */
export function twin(name: string, args: [string, 'vec3' | 'vec4' | 'float'][], body: string, prelude = '') {
  const glsl = `${prelude}\nvec4 ${name}(${args.map(([n, t]) => `${t} ${n}`).join(', ')}) {\n${body}\n}\n`;
  const wt = (t: string) => (t === 'float' ? 'f32' : t + 'f');
  const wgsl = `${glslBodyToWgsl(prelude.replace(/\bfloat (\w+)\s*\(([^)]*)\)\s*\{/g, (_m, n, a) => `fn ${n}(${a.split(',').filter(Boolean).map((s: string) => { const [t, v] = s.trim().split(/\s+/); return `${v}: ${wt(t)}`; }).join(', ')}) -> f32 {`))}\nfn ${name}(${args.map(([n, t]) => `${n}: ${wt(t)}`).join(', ')}) -> vec4f {\n${glslBodyToWgsl(body)}\n}\n`;
  return { glsl, wgsl };
}
