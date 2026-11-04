// v03e · the loading curtain, inlined into every page's <body> at build time (vite.config.ts `curtain` plugin), so it is
// on screen with the very first paint — before any CSS file or JS module loads (no flash of an empty page).
// A tiny pixel jelly pig hops on the colour the previous page closed on (sessionStorage 'gift.curtain', written by
// curtain.ts cover()), with the next stop's name and, on heavy pages, a pixel progress bar. The inline script also owns
// the safety net: an error before the reveal, or a very long wait, turns the curtain into a gentle "retry / skip" card,
// so a failure can never leave a blank screen. Runtime API: window.__curtain (wrapped by src/shared/curtain.ts).
// Plain strings only (this file is imported by vite.config.ts in node).

// 16 x 13 pixel pig: o outline, p body, s snout, n nostril, e eye, b blush, l light
const PIG = [
  '..oo........oo..',
  '.oppo......oppo.',
  '.opppoooooopppo.',
  'oplppppppppppppo',
  'oppppppppppppppo',
  'oppeppppppppeppo',
  'opbbpsssssspbbpo',
  'oppppsnssnsppppo',
  'oppppssssssppppo',
  '.oppppppppppppo.',
  '..oooppppppooo..',
  '...opo....opo...',
  '...oo......oo...',
];
const FILL: Record<string, string> = { o: '#2E2A2B', p: '#F9C6CF', s: '#EE8FA6', n: '#B85A72', e: '#2E2A2B', b: '#F4A7B9', l: '#FFFFFF' };
function pigSvg() {
  let r = '';
  PIG.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = row[x]; if (FILL[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${FILL[c]}"/>`; } });
  return `<svg class="gcc-pig" viewBox="0 0 16 13" width="64" height="52" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

/** stage -> [default curtain colour (= the page's own first colour), zh label, en label] */
export const CURTAIN_STAGES: Record<string, [string, string, string]> = {
  meadow: ['#5EC4FF', '草地', 'the meadow'],
  shop: ['#f6efe4', '小店', 'the shop'],
  night: ['#0b0b0c', '夜路', 'the night path'],
  jelly: ['#cfcdc8', '果冻标本', 'jelly studies'],
  sea: ['#0d2c3b', '海里', 'the sea'],
  sky: ['#04060b', '长春的天空', 'the sky'],
  coop: ['#5EC4FF', '一起玩', 'together'],
  ar: ['#eeece8', '桌上', 'on the table'],
};
const NEXT: Record<string, string> = { meadow: 'shop/', shop: 'night/', night: 'jelly/', jelly: 'sea/', sea: 'sky/', sky: 'coop/', coop: '', ar: 'shop/' };
const TXT = {
  zh: { wait: '马上就好', slow: '还在努力加载…', oops: '哎呀，这一页卡住了', retry: '再试一次', skip: '跳到下一站' },
  en: { wait: 'one moment', slow: 'still loading…', oops: 'oops, this page got stuck', retry: 'try again', skip: 'skip ahead' },
};

const CSS = `
#gift-curtain{position:fixed;inset:0;z-index:120;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--gcc-bg,#eeece8);color:var(--gcc-ink,#141414);font:13px/1.4 'Source Serif','Noto Serif SC Sub','Songti SC','STSong',Georgia,serif;letter-spacing:.14em;opacity:1;transition:opacity .42s cubic-bezier(.65,0,.35,1);-webkit-user-select:none;user-select:none;touch-action:none}
#gift-curtain.gcc-out{opacity:0;pointer-events:none}
#gift-curtain.gcc-gone{display:none}
#gift-curtain .gcc-stage{position:relative;width:64px;height:66px}
#gift-curtain .gcc-pig{position:absolute;left:0;bottom:8px;image-rendering:pixelated;transform-origin:50% 100%;animation:gcc-hop .84s steps(1,end) infinite}
#gift-curtain .gcc-sh{position:absolute;left:14px;bottom:2px;width:36px;height:5px;background:currentColor;opacity:.16;animation:gcc-sh .84s steps(1,end) infinite}
@keyframes gcc-hop{0%{transform:translateY(0) scale(1.14,.86)}12%{transform:translateY(-6px) scale(.94,1.08)}24%{transform:translateY(-12px) scale(.96,1.05)}36%{transform:translateY(-15px) scale(1,1)}50%{transform:translateY(-15px) scale(1,1)}62%{transform:translateY(-12px)}74%{transform:translateY(-6px) scale(.97,1.04)}88%{transform:translateY(0) scale(1.1,.9)}100%{transform:translateY(0) scale(1.14,.86)}}
@keyframes gcc-sh{0%,88%,100%{transform:scaleX(1)}12%,74%{transform:scaleX(.8)}24%,62%{transform:scaleX(.66)}36%,50%{transform:scaleX(.58)}}
#gift-curtain .gcc-to{margin:0;opacity:.78;text-transform:lowercase}
#gift-curtain .gcc-dots i{display:inline-block;width:4px;height:4px;margin:0 3px;background:currentColor;opacity:.25;animation:gcc-dot 1.2s steps(1,end) infinite}
#gift-curtain .gcc-dots i:nth-child(2){animation-delay:.2s}#gift-curtain .gcc-dots i:nth-child(3){animation-delay:.4s}
@keyframes gcc-dot{0%,40%{opacity:.85}41%,100%{opacity:.22}}
#gift-curtain .gcc-bar{width:120px;height:4px;box-shadow:0 0 0 1px currentColor;opacity:0;transition:opacity .3s}
#gift-curtain.gcc-prog .gcc-bar{opacity:.7}
#gift-curtain .gcc-bar i{display:block;height:100%;width:0;background:currentColor;transition:width .25s steps(4,end)}
#gift-curtain .gcc-msg{display:none;margin:4px 0 0;text-align:center;max-width:80vw;line-height:1.7}
#gift-curtain .gcc-acts{display:none;gap:18px}
#gift-curtain .gcc-acts a{color:inherit;text-decoration:none;border-bottom:1px solid currentColor;padding:6px 2px;cursor:pointer}
#gift-curtain.gcc-slow .gcc-msg,#gift-curtain.gcc-fail .gcc-msg{display:block}
#gift-curtain.gcc-slow .gcc-acts,#gift-curtain.gcc-fail .gcc-acts{display:flex}
#gift-curtain.gcc-fail .gcc-pig{animation:none;transform:rotate(-8deg)}#gift-curtain.gcc-fail .gcc-sh,#gift-curtain.gcc-fail .gcc-dots,#gift-curtain.gcc-fail .gcc-bar{display:none}
#gift-curtain.gcc-solid .gcc-stage,#gift-curtain.gcc-solid .gcc-to,#gift-curtain.gcc-solid .gcc-dots,#gift-curtain.gcc-solid .gcc-bar{opacity:0}
@media (prefers-reduced-motion:reduce){#gift-curtain,#gift-curtain *{animation:none!important;transition:none!important}}
`.replace(/\n/g, '');

// runs synchronously right after the markup: colour, label, language, bfcache, error net. ES2017, no dependencies.
const SCRIPT = `(function(){
var d=document,c=d.getElementById('gift-curtain');if(!c)return;
var S=${JSON.stringify(CURTAIN_STAGES)},N=${JSON.stringify(NEXT)},T=${JSON.stringify(TXT)};
var m=d.querySelector('meta[name="gift-stage"]'),st=m?m.content:'meadow',q=new URLSearchParams(location.search);
var L='en';try{L=q.get('lang')||localStorage.getItem('jelly.lang')||(/^zh/i.test(navigator.language)?'zh':'en')}catch(e){}L=/^zh/i.test(L)?'zh':'en';var t=T[L];
var col=(S[st]||S.ar)[0],solid=false;
try{var s=JSON.parse(sessionStorage.getItem('gift.curtain')||'null');if(s&&s.to===st&&Date.now()-s.t<30000){col=s.c;}sessionStorage.removeItem('gift.curtain')}catch(e){}
function ink(h){var x=parseInt(h.slice(1),16);var r=x>>16&255,g=x>>8&255,b=x&255;return (r*299+g*587+b*114)/1000>150?'#141414':'#f6efe4'}
function paint(bg,stage){c.style.setProperty('--gcc-bg',bg);c.style.setProperty('--gcc-ink',ink(bg));var l=S[stage]||S[st];c.querySelector('.gcc-to').textContent=(L==='zh'?l[1]:l[2]);}
paint(col,st);c.setAttribute('lang',L==='zh'?'zh-CN':'en');
var rel=st==='meadow'?'./':'../',carry=[];['lang','dev','sound'].forEach(function(k){if(q.has(k))carry.push(k+'='+encodeURIComponent(q.get(k)))});
var nx=c.querySelector('.gcc-skip');nx.href=rel+(N[st]||'')+(carry.length?'?'+carry.join('&'):'');nx.textContent=t.skip;
var rt=c.querySelector('.gcc-retry');rt.textContent=t.retry;rt.addEventListener('click',function(e){e.preventDefault();location.reload()});
var msg=c.querySelector('.gcc-msg'),bar=c.querySelector('.gcc-bar i');
var C=window.__curtain={el:c,stage:st,lang:L,shown:true,held:0,errors:[],
 progress:function(p){c.classList.add('gcc-prog');bar.style.width=Math.round(Math.max(0,Math.min(1,p))*100)+'%'},
 reveal:function(ms){if(!C.shown)return;C.shown=false;clearTimeout(slowT);c.classList.remove('gcc-slow','gcc-fail');var f=function(){c.classList.add('gcc-gone')};
  if(ms===0||matchMedia('(prefers-reduced-motion: reduce)').matches){c.classList.add('gcc-out');f();return}
  if(ms)c.style.transitionDuration=ms+'ms';c.classList.add('gcc-out');setTimeout(f,(ms||420)+40)},
 cover:function(bg,stage){C.shown=true;clearTimeout(slowT);c.classList.remove('gcc-gone','gcc-out','gcc-slow','gcc-fail','gcc-prog');c.style.transitionDuration='';paint(bg,stage||st)},
 fail:function(why){if(why)C.errors.push(String(why));if(!C.shown)return;c.classList.remove('gcc-out','gcc-gone','gcc-slow');c.classList.add('gcc-fail');msg.textContent=t.oops},
 paint:paint,ink:ink,txt:t};
var slowT=setTimeout(function(){if(C.shown&&!c.classList.contains('gcc-fail')){c.classList.add('gcc-slow');msg.textContent=t.slow}},20000);
function err(e){if(!C.shown)return;var tg=e&&e.target;if(tg&&tg!==window&&tg.tagName&&!/^(SCRIPT|LINK)$/.test(tg.tagName))return;
 C.errors.push(String(e&&(e.message||e.reason&&(e.reason.message||e.reason))||e));setTimeout(function(){if(C.shown)C.fail()},2500)}
window.addEventListener('error',err,true);window.addEventListener('unhandledrejection',err);
window.addEventListener('pageshow',function(e){if(!e.persisted)return;C.reveal(0);var v=d.querySelectorAll('.gift-iris,.pink-veil');for(var i=0;i<v.length;i++){v[i].style.transition='opacity .35s';v[i].style.opacity='0'}});
})();`;

/** markup + style + script injected right after <body> on every page */
export function curtainMarkup(): string {
  return `<div id="gift-curtain" aria-hidden="true"><style>${CSS}</style><div class="gcc-stage">${pigSvg()}<i class="gcc-sh"></i></div>`
    + `<p class="gcc-to"></p><div class="gcc-dots"><i></i><i></i><i></i></div><div class="gcc-bar"><i></i></div>`
    + `<p class="gcc-msg"></p><div class="gcc-acts"><a class="gcc-retry" href="#"></a><a class="gcc-skip" href="./"></a></div></div>`
    + `<script>${SCRIPT}</script>`;
}
