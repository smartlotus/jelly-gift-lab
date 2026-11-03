// probe: does a WebGPU canvas show up in a headless screenshot? (simple clear test + app canvas readback)
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 400, height: 300 });
p.on('console', m => console.log(' console', m.text()));
await p.goto('http://localhost:8800/jelly/');
await p.waitForFunction(() => window.__jellyReady, { timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
const r = await p.evaluate(async () => {
  const c = document.getElementById('gl'); const cs = getComputedStyle(c);
  const o = { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, vis: cs.visibility, op: cs.opacity, disp: cs.display };
  const c2 = document.createElement('canvas'); c2.width = 4; c2.height = 4; const g = c2.getContext('2d');
  g.drawImage(c, 0, 0, 4, 4); o.px = Array.from(g.getImageData(0, 0, 4, 4).data.slice(0, 16));
  // standalone clear test
  const t = document.createElement('canvas'); t.width = 64; t.height = 64; t.style.cssText = 'position:fixed;left:0;top:0;width:64px;height:64px;z-index:99'; document.body.appendChild(t);
  const a = await navigator.gpu.requestAdapter(); const d = await a.requestDevice(); const ctx = t.getContext('webgpu');
  ctx.configure({ device: d, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
  const e = d.createCommandEncoder(); const ps = e.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [1, 0, 0, 1] }] }); ps.end(); d.queue.submit([e.finish()]);
  await d.queue.onSubmittedWorkDone();
  return o;
});
console.log(JSON.stringify(r));
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: '/tmp/probe-canvas.png' });
await b.close();
