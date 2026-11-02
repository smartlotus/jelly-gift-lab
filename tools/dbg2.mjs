import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage(); await page.setViewport({width:800,height:500});
page.on('console', m => { if (!m.text().includes('stall')) console.log(m.text().slice(0,300)); });
await page.goto('http://localhost:8800/?backend=webgl2'); await page.waitForFunction(() => window.__jellyReady, {timeout: 60000});
await new Promise(r=>setTimeout(r,2000));
console.log(await page.evaluate(() => { const e = window.__jelly; const b = e.path.gl; const gl = b.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, b.shadow.fbo); const px = new Float32Array(512*512*4); gl.readPixels(0,0,512,512,gl.RGBA,gl.FLOAT,px);
  let mn=[1e9,1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9,-1e9], nz=0; for (let i=0;i<512*512;i++){ for(let c=0;c<4;c++){mn[c]=Math.min(mn[c],px[4*i+c]); mx[c]=Math.max(mx[c],px[4*i+c]);} if (px[4*i]!==0) nz++; }
  return JSON.stringify({mn,mx,nz, err: gl.getError()}); }));
await browser.close();
