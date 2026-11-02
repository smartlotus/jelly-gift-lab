import puppeteer from 'puppeteer-core';
const base=['--no-sandbox','--enable-unsafe-webgpu','--enable-unsafe-swiftshader'];
const sets = {
 a: ['--headless=new','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface'],
 b: ['--headless=new','--use-webgpu-adapter=swiftshader','--enable-features=Vulkan,WebGPUService'],
 c: ['--enable-features=Vulkan','--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader'],
 d: ['--headless=new','--enable-features=Vulkan,SkiaGraphite','--use-angle=swiftshader-webgl','--ignore-gpu-blocklist','--use-webgpu-adapter=swiftshader'],
};
for (const [k,args] of Object.entries(sets)) {
  const b = await puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless: args.includes('--headless=new')?'new':false, args:[...base,...args], ignoreDefaultArgs:['--headless']});
  const p = await b.newPage();
  p.on('console', m=>console.log(' console', m.text()));
  await p.goto('http://localhost:8799/');
  const r = await p.evaluate(async()=>{
    let out={has:!!navigator.gpu};
    try{ const a = await navigator.gpu?.requestAdapter({forceFallbackAdapter:false}) || await navigator.gpu?.requestAdapter({forceFallbackAdapter:true}); out.gpu = !!a; if(a){ out.info = {v:a.info?.vendor, a:a.info?.architecture, d:a.info?.description}; const d=await a.requestDevice(); out.dev=!!d;} }catch(e){out.err=String(e)}
    return out;});
  console.log(k, JSON.stringify(r));
  await b.close();
}
