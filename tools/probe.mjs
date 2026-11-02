import puppeteer from 'puppeteer-core';
const sets = {
 a: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'],
 b: ['--enable-unsafe-webgpu','--enable-features=Vulkan,WebGPU','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'],
 c: ['--enable-unsafe-webgpu','--enable-unsafe-swiftshader','--use-angle=vulkan','--enable-features=Vulkan','--no-sandbox'],
};
for (const [k,args] of Object.entries(sets)) {
  const b = await puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless:'new', args});
  const p = await b.newPage();
  await p.goto('http://localhost:8799/');
  const r = await p.evaluate(async()=>{
    let out={};
    try{ const a = await navigator.gpu?.requestAdapter(); out.gpu = !!a; if(a){ out.info = a.info ? {...a.info, vendor:a.info.vendor, arch:a.info.architecture, desc:a.info.description}:null; const d=await a.requestDevice(); out.dev=!!d; out.lim=a.limits.maxStorageBuffersPerShaderStage;} }catch(e){out.err=String(e)}
    const gl = document.createElement('canvas').getContext('webgl2'); out.gl2=!!gl; if(gl){out.r=gl.getParameter(gl.RENDERER); out.cbf=!!gl.getExtension('EXT_color_buffer_float');}
    return out;});
  console.log(k, JSON.stringify(r));
  await b.close();
}
