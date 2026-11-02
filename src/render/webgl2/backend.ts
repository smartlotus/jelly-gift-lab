import * as S from './shaders';
import { FRAME_FLOATS } from '../frame';
import type { TetAsset } from '../../sim/mesh';
import type { Backend, FrameInput } from '../backend';

function compile(gl: WebGL2RenderingContext, vs: string, fs: string, name: string) {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s); const lines = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
      console.warn(lines); throw new Error(`${name} ${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}: ${log}`);
    }
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ' link: ' + gl.getProgramInfoLog(p));
  const bi = gl.getUniformBlockIndex(p, 'Frame'); if (bi !== gl.INVALID_INDEX) gl.uniformBlockBinding(p, bi, 0);
  return p;
}

interface Target { fbo: WebGLFramebuffer; tex: WebGLTexture; msFbo?: WebGLFramebuffer; rbs: WebGLRenderbuffer[]; w: number; h: number }

export class WebGL2Backend implements Backend {
  kind = 'webgl2' as const;
  gl: WebGL2RenderingContext;
  progs: Record<string, WebGLProgram> = {};
  ubo!: WebGLBuffer;
  nodeTex!: WebGLTexture; restTex!: WebGLTexture;
  nodeRows = 1;
  vaoOuter!: WebGLVertexArrayObject; vaoInner!: WebGLVertexArrayObject; vaoBub!: WebGLVertexArrayObject; vaoEmpty!: WebGLVertexArrayObject;
  nOuter = 0; nInner = 0; nBub = 0; idxType = 0;
  shadow!: Target; scene?: Target; back?: Target; shell?: Target;
  W = 1; H = 1; samples = 4;
  halfFloat = true;
  constructor(public canvas: HTMLCanvasElement, public asset: TetAsset, opts: { msaa: number }) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) {
      if (!gl.getExtension('EXT_color_buffer_half_float')) this.halfFloat = false;
    }
    gl.getExtension('OES_texture_float_linear');
    this.samples = Math.min(opts.msaa, gl.getParameter(gl.MAX_SAMPLES));
    this.init();
  }

  private init() {
    const gl = this.gl; const a = this.asset;
    const P = this.progs;
    P.shadow = compile(gl, S.MESH_VS, S.SHADOW_FS, 'shadow');
    P.back = compile(gl, S.MESH_VS, S.BACK_FS, 'back');
    P.inner = compile(gl, S.MESH_VS, S.INNER_FS, 'inner');
    P.shell = compile(gl, S.MESH_VS, S.SHELL_FS, 'shell');
    P.backdrop = compile(gl, S.FULL_VS, S.BACKDROP_FS, 'backdrop');
    P.bubble = compile(gl, S.BUBBLE_VS, S.BUBBLE_FS, 'bubble');
    P.bead = compile(gl, S.BEAD_VS, S.BEAD_FS, 'bead');
    P.composite = compile(gl, S.FULL_VS, S.COMPOSITE_FS, 'composite');
    this.ubo = gl.createBuffer()!;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo); gl.bufferData(gl.UNIFORM_BUFFER, FRAME_FLOATS * 4, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.ubo);
    // node textures
    const N = a.nodes.length / 3;
    this.nodeRows = Math.ceil((N * 4) / 1024);
    this.nodeTex = this.floatTex(1024, this.nodeRows);
    const restRows = Math.ceil(N / 1024);
    this.restTex = this.floatTex(1024, restRows);
    const rest = new Float32Array(1024 * restRows * 4);
    for (let i = 0; i < N; i++) rest.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], 1], 4 * i);
    gl.bindTexture(gl.TEXTURE_2D, this.restTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, restRows, gl.RGBA, gl.FLOAT, rest);
    // meshes
    const s = a.s;
    const mkVao = (pfx: string) => {
      const vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
      const buf = (data: ArrayBufferView, loc: number, size: number, type: number, norm: boolean, int = false) => {
        const b = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        if (int) gl.vertexAttribIPointer(loc, size, type, 0, 0); else gl.vertexAttribPointer(loc, size, type, norm, 0, 0);
      };
      buf(s[pfx + 'pos'], 0, 4, gl.UNSIGNED_SHORT, true);
      buf(s[pfx + 'nrm'], 1, 4, gl.SHORT, true);
      buf(s[pfx + 'attr'], 2, 4, gl.UNSIGNED_BYTE, true);
      buf(s[pfx + 'nodes'], 3, 4, gl.UNSIGNED_SHORT, false, true);
      buf(s[pfx + 'wts'], 4, 4, gl.SHORT, true);
      const ib = gl.createBuffer()!; gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, s[pfx + 'idx'], gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return vao;
    };
    this.vaoOuter = mkVao('o_'); this.nOuter = s.o_idx.length;
    this.vaoInner = mkVao('i_'); this.nInner = s.i_idx.length;
    // bubbles
    this.vaoBub = gl.createVertexArray()!; gl.bindVertexArray(this.vaoBub);
    const ib = (data: ArrayBufferView, loc: number, size: number, type: number, int: boolean) => {
      const b = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      if (int) gl.vertexAttribIPointer(loc, size, type, 0, 0); else gl.vertexAttribPointer(loc, size, type, false, 0, 0);
      gl.vertexAttribDivisor(loc, 1);
    };
    ib(s.bub, 0, 4, gl.FLOAT, false); ib(s.bubN, 1, 4, gl.UNSIGNED_SHORT, true); ib(s.bubW, 2, 4, gl.FLOAT, false);
    this.nBub = s.bub.length / 4;
    gl.bindVertexArray(null);
    this.vaoEmpty = gl.createVertexArray()!;
    // shadow target
    this.shadow = this.makeTarget(512, 512, 0, false);
    this.uploadNodes(this.restNodeData());
  }

  restNodeData() {
    const a = this.asset; const N = a.nodes.length / 3; const nd = new Float32Array(N * 16);
    for (let i = 0; i < N; i++) { nd.set([a.nodes[3 * i], a.nodes[3 * i + 1], a.nodes[3 * i + 2], 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], 16 * i); }
    return nd;
  }

  private floatTex(w: number, h: number) {
    const gl = this.gl; const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  private nodeStage?: Float32Array;
  uploadNodes(nd: Float32Array) {
    const gl = this.gl;
    const need = 1024 * this.nodeRows * 4;
    if (!this.nodeStage || this.nodeStage.length !== need) this.nodeStage = new Float32Array(need);
    this.nodeStage.set(nd);
    gl.bindTexture(gl.TEXTURE_2D, this.nodeTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, this.nodeRows, gl.RGBA, gl.FLOAT, this.nodeStage);
  }

  private makeTarget(w: number, h: number, samples: number, depth: boolean, nearest = false): Target {
    const gl = this.gl;
    const fmt = this.halfFloat ? gl.RGBA16F : gl.RGBA8;
    const tex = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    const flt = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, flt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, flt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const rbs: WebGLRenderbuffer[] = [];
    let msFbo: WebGLFramebuffer | undefined;
    if (samples > 1) {
      msFbo = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
      const crb = gl.createRenderbuffer()!; gl.bindRenderbuffer(gl.RENDERBUFFER, crb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, crb); rbs.push(crb);
      if (depth) {
        const drb = gl.createRenderbuffer()!; gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb); rbs.push(drb);
      }
    } else if (depth) {
      const drb = gl.createRenderbuffer()!; gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb); rbs.push(drb);
    }
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO incomplete ' + st);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, msFbo, rbs, w, h };
  }
  private freeTarget(t?: Target) {
    if (!t) return; const gl = this.gl;
    gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.tex); if (t.msFbo) gl.deleteFramebuffer(t.msFbo); t.rbs.forEach(r => gl.deleteRenderbuffer(r));
  }

  resize(w: number, h: number) {
    if (w === this.W && h === this.H && this.scene) return;
    this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
    this.freeTarget(this.scene); this.freeTarget(this.back); this.freeTarget(this.shell);
    this.scene = this.makeTarget(w, h, this.samples, true);
    this.back = this.makeTarget(w, h, 0, true, true);
    this.shell = this.makeTarget(w, h, this.samples, true);
  }

  private bindTex(prog: WebGLProgram, name: string, unit: number, tex: WebGLTexture) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, name), unit);
  }
  private drawMesh(prog: WebGLProgram, vao: WebGLVertexArrayObject, count: number) {
    const gl = this.gl;
    this.bindTex(prog, 'uNodes', 0, this.nodeTex); this.bindTex(prog, 'uRest', 1, this.restTex);
    gl.bindVertexArray(vao); gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
  }
  private resolve(t: Target) {
    if (!t.msFbo) return; const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.fbo);
    gl.blitFramebuffer(0, 0, t.w, t.h, 0, 0, t.w, t.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }

  render(f: FrameInput) {
    const gl = this.gl; const P = this.progs;
    if (f.nodeData) this.uploadNodes(f.nodeData);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, f.frame);
    // 1. shadow thickness from the key light
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fbo); gl.viewport(0, 0, 512, 512);
    gl.clearColor(0, 0, 0, 10); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.MIN); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.shadow); gl.uniform1i(gl.getUniformLocation(P.shadow, 'uLight'), 1);
    gl.uniform1i(gl.getUniformLocation(P.shadow, 'uLayer'), 0); this.drawMesh(P.shadow, this.vaoOuter, this.nOuter);
    gl.uniform1i(gl.getUniformLocation(P.shadow, 'uLayer'), 1); this.drawMesh(P.shadow, this.vaoInner, this.nInner);
    gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
    // 2. scene: backdrop, milky layer, bubbles, beads
    const sc = this.scene!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, sc.msFbo ?? sc.fbo); gl.viewport(0, 0, sc.w, sc.h);
    gl.clearColor(0, 0, 0, 1000); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(P.backdrop); this.bindTex(P.backdrop, 'uShadow', 2, this.shadow.tex);
    gl.bindVertexArray(this.vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.useProgram(P.inner); gl.uniform1i(gl.getUniformLocation(P.inner, 'uLight'), 0); this.bindTex(P.inner, 'uShadow', 2, this.shadow.tex);
    this.drawMesh(P.inner, this.vaoInner, this.nInner);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(P.bead); gl.bindVertexArray(this.vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 6 * 16);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
    gl.useProgram(P.bubble); this.bindTex(P.bubble, 'uNodes', 0, this.nodeTex);
    gl.bindVertexArray(this.vaoBub); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nBub);
    gl.disable(gl.BLEND); gl.depthMask(true);
    this.resolve(sc);
    // 3. shell back faces -> thickness
    const bk = this.back!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, bk.fbo); gl.viewport(0, 0, bk.w, bk.h);
    gl.clearColor(1000, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
    gl.useProgram(P.back); gl.uniform1i(gl.getUniformLocation(P.back, 'uLight'), 0);
    this.drawMesh(P.back, this.vaoOuter, this.nOuter);
    // 4. shell front faces
    const sh = this.shell!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, sh.msFbo ?? sh.fbo); gl.viewport(0, 0, sh.w, sh.h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.cullFace(gl.BACK);
    gl.useProgram(P.shell); gl.uniform1i(gl.getUniformLocation(P.shell, 'uLight'), 0);
    this.bindTex(P.shell, 'uScene', 2, sc.tex); this.bindTex(P.shell, 'uBack', 3, bk.tex);
    this.drawMesh(P.shell, this.vaoOuter, this.nOuter);
    gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST);
    this.resolve(sh);
    // 5. composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(P.composite);
    this.bindTex(P.composite, 'uScene', 0, sc.tex); this.bindTex(P.composite, 'uShell', 1, sh.tex);
    gl.uniform4f(gl.getUniformLocation(P.composite, 'uParams'), f.exposure, f.time, 1.5 / 255, 0.35);
    gl.bindVertexArray(this.vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
