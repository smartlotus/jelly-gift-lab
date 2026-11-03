// Camcorder found-footage post pass: low-res world render -> grain, scanlines, vignette, chroma, tape tear, static.
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, type Texture } from 'three';

export function makePost() {
  const u = {
    tDiffuse: { value: null as Texture | null }, uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) },
    uNoise: { value: 0 }, uTear: { value: 0 }, uChroma: { value: 1 }, uBlack: { value: 0 }, uShake: { value: new Vector2() }, uRed: { value: 0 },
  };
  const mat = new ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tDiffuse; uniform float uTime, uNoise, uTear, uChroma, uBlack, uRed; uniform vec2 uRes, uShake;
      varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 uv = vUv + uShake;
        float ty = floor(uv.y * 48.0), tt = floor(uTime * 24.0);
        float band = step(0.93 - uTear * 0.5, h(vec2(ty, tt)));
        uv.x += (h(vec2(ty, tt + 1.0)) - 0.5) * band * (0.012 + uTear * 0.09);
        uv.x += sin(uv.y * 180.0 + uTime * 9.0) * 0.0007;
        vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 - 0.035 * dot(c, c));
        float ca = uChroma * (0.0012 + 0.0045 * dot(c, c)) + uTear * 0.006;
        vec3 col = vec3(texture2D(tDiffuse, uv + vec2(ca, 0.)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ca, 0.)).b);
        // camcorder grade: slight cool shadows, warm highlights, soft contrast
        float l = dot(col, vec3(.299, .587, .114));
        col = mix(col, vec3(l), 0.18);
        col = col * vec3(0.96, 1.0, 1.04) + vec3(0.006, 0.008, 0.014);
        col = mix(col, col * vec3(1.25, 0.55, 0.6), uRed);
        vec2 px = floor(vUv * uRes / 2.0);
        float n = h(px + fract(uTime * 7.31) * 913.0);
        col += (n - 0.5) * (0.07 + uNoise * 0.2);
        col *= 0.93 + 0.07 * sin(vUv.y * uRes.y * 1.4);
        float v = smoothstep(0.82, 0.18, length(c * vec2(1.0, 0.86)));
        col *= mix(0.25, 1.0, v);
        // full static (tape snow) with rolling bright band
        float sn = h(px * 1.7 + uTime * 61.0);
        float roll = smoothstep(0.08, 0.0, abs(fract(vUv.y + uTime * 1.6) - 0.5) - 0.38);
        col = mix(col, vec3(sn * 0.8 + roll * 0.25), uNoise);
        col *= 1.0 - uBlack;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const scene = new Scene(); const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const q = new Mesh(new PlaneGeometry(2, 2), mat); q.frustumCulled = false; scene.add(q);
  return { scene, cam, u };
}
