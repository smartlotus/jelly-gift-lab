(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={Float32Array,Uint32Array,Uint16Array,Int16Array,Uint8Array,Int32Array};function t(t){let n=new Uint8Array(t);if(new TextDecoder().decode(n.subarray(0,4))!==`JLY1`)throw Error(`bad asset`);let r=new DataView(t).getUint32(4,!0),i=JSON.parse(new TextDecoder().decode(n.subarray(8,8+r))),a={};for(let[n,o]of Object.entries(i.sections)){let i=e[o.type];a[n]=new i(t,8+r+o.offset,o.length)}return{meta:i.meta,s:a}}function n(e,n,r){let{meta:i,s:a}=t(e),o=a.nodes,s=a.tets,c=o.length/3,l=s.length/4,u=new Float32Array(l*9),d=new Float32Array(l),f=new Float32Array(c),p=new Float32Array(l*n.channels),m=new Float32Array(l),h=new Float32Array(n.channels);for(let e=0;e<l;e++){let t=s[4*e]*3,i=[];for(let n=0;n<3;n++)for(let r=0;r<3;r++)i.push(o[s[4*e+1+r]*3+n]-o[t+n]);let[a,c,l,g,_,v,y,b,x]=i,S=a*(_*x-v*b)-c*(g*x-v*y)+l*(g*b-_*y),C=1/S;u.set([(_*x-v*b)*C,(l*b-c*x)*C,(c*v-l*_)*C,(v*y-g*x)*C,(a*x-l*y)*C,(l*g-a*v)*C,(g*b-_*y)*C,(c*y-a*b)*C,(a*_-c*g)*C],9*e),d[e]=S/6;for(let t=0;t<4;t++)f[s[4*e+t]]+=S/6/4*r;let w=0,T=0,ee=0;for(let t=0;t<4;t++){let n=s[4*e+t]*3;w+=o[n]/4,T+=o[n+1]/4,ee+=o[n+2]/4}n.weights(w,T,ee,h),p.set(h,e*n.channels),m[e]=n.stiffness?n.stiffness(w,T,ee):1}let g=new Float32Array(c),_=new Float32Array(c);for(let e=0;e<c;e++)g[e]=n.friction?n.friction(o[3*e],o[3*e+1],o[3*e+2]):1,_[e]=n.gravity?n.gravity(o[3*e],o[3*e+1],o[3*e+2]):1;let v=new Float32Array(c);for(let e=0;e<c;e++)v[e]=f[e]>0?1/f[e]:0;let y=new Uint32Array(c+1);for(let e=0;e<l*4;e++)y[s[e]+1]++;for(let e=0;e<c;e++)y[e+1]+=y[e];let b=y.slice(0,c),x=new Uint32Array(l*4);for(let e=0;e<l;e++)for(let t=0;t<4;t++)x[b[s[4*e+t]]++]=e;let S=new Float32Array(12);for(let e=0;e<4;e++){let t=n.axes?.[e]??[1,0,0],r=Math.hypot(t[0],t[1],t[2])||1;S.set([t[0]/r,t[1]/r,t[2]/r],3*e)}return{meta:i,axes:S,nodes:o,tets:s,colourOffsets:a.colourOffsets,finW:a.finW,B:u,restVol:d,invMass:v,mass:f,muscle:p,stiff:m,fric:g,grav:_,channels:n.channels,adjOffsets:y,adjTets:x,s:a}}var r=(e,t,n)=>e<t?t:e>n?n:e,i=(e,t,n)=>e+(t-e)*n,a=(e,t,n)=>{let i=r((n-e)/(t-e),0,1);return i*i*(3-2*i)},o=(e,t,n)=>{if(n<=0)return Math.min(e,t);let r=Math.max(n-Math.abs(e-t),0)/n;return Math.min(e,t)-r*r*n*.25},s=(e,t,n)=>-o(-e,-t,n);function c(e,t,n,r){let i=Math.hypot(e/n,t/r);if(i<1e-9)return-Math.min(n,r);let a=Math.hypot(e/(n*n),t/(r*r));return i*(i-1)/a}function l(e,t){return Math.hypot(Math.max(e,0),Math.max(t,0))+Math.min(Math.max(e,t),0)}function u(e,t){let n=e.length;return r=>{if(r<=e[0])return t[0];if(r>=e[n-1])return t[n-1];let i=0;for(;i<n-2&&r>e[i+1];)i++;let a=e[i],o=e[i+1],s=(r-a)/(o-a),c=t[Math.max(i-1,0)],l=t[i],u=t[i+1],d=t[Math.min(i+2,n-1)],f=(u-c)/(e[i+1]-e[Math.max(i-1,0)]||1)*(o-a),p=(d-l)/(e[Math.min(i+2,n-1)]-e[i]||1)*(o-a),m=s*s,h=m*s;return(2*h-3*m+1)*l+(h-2*m+s)*f+(-2*h+3*m)*u+(h-m)*p}}var d={sub:(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],add:(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],scale:(e,t)=>[e[0]*t,e[1]*t,e[2]*t],dot:(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],cross:(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],len:e=>Math.hypot(e[0],e[1],e[2]),norm:e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}};function f(e){let t=d.norm(e.U),n=d.sub(e.V,d.scale(t,d.dot(e.V,t)));n=d.norm(n);let r=d.norm(d.cross(t,n));return{spec:e,U:t,V:n,N:r}}function p(e,t,n,r,i,a){let o=Math.hypot(e/r,t/i,n/a);if(o<1e-9)return-Math.min(r,i,a);let s=Math.hypot(e/(r*r),t/(i*i),n/(a*a));return o*(o-1)/s}var m=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},h=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]];function g(e,t,n){let r=m(t),i=m(h(r,n));return{o:e,u:i,v:r,w:h(i,r)}}var _=[-.42,-.36,-.29,-.2,-.09,.03,.14,.24,.33,.4,.47],v=u(_,[.01,.016,.028,.046,.06,.069,.073,.064,.047,.04,.03]),y=u(_,[.016,.022,.036,.057,.075,.089,.095,.08,.053,.04,.026]),b=u(_,[.08,.078,.076,.08,.087,.093,.096,.083,.064,.056,.05]),x=-.42,S=.47;function C(e,t,n){let i=r(e,x,S),a=v(i),o=y(i),s=c(n,t-b(i),a,o),l=Math.abs(e-i);return l>0?Math.hypot(Math.max(s,0),l)+Math.min(s,0)*0:s}var w=.226,T=e=>{let t=Math.abs(e)/w;return .505-.018*t*t-.0085*Math.exp(-(e*e)/(.011*.011))},ee=e=>{let t=Math.abs(e)/w;return T(e)-(.072+.045*Math.exp(-(e*e)/.003025))-.03*t*t},te=e=>.05-e*e*.006/(w*w),ne=e=>.019+.012*Math.exp(-(e*e)/(.065*.065));function re(e,t,n){let o=T(n),c=ee(n),u=s(Math.max(e-o,c-e),Math.abs(n)-w,.028),d=r((o-e)/(o-c),0,1),f=Math.min(1.6*Math.sqrt(d)*(1-d)**.9/.64,1),p=a(.196,w,Math.abs(n)),m=Math.max(ne(n)*f,.0035)*i(1,.85,p),h=Math.abs(t-te(n))-m,g=Math.min(m*.95,.008);return l(u+g,h+g)-g}var ie=e=>[T(w)-.022,te(w)+.004,e*.218],E=e=>({lePow:2,falcate:0,tmin:.0042,bury:.35,...e});[E({name:`dorsal1`,o:[.135,.15,0],U:[-1,0,0],V:[-.05,1,0],H:.25,C:.155,sweep:.155,falcate:.075,t0:.018,lePow:2.1}),E({name:`dorsal2`,o:[-.215,.095,0],U:[-1,0,0],V:[-.1,1,0],H:.066,C:.056,sweep:.046,falcate:.014,t0:.0085}),E({name:`pectoralL`,o:[.235,.04,.04],U:[-1,0,.12],V:[-.18,-.22,1],H:.17,C:.09,sweep:.09,falcate:.03,t0:.012}),E({name:`pectoralR`,o:[.235,.04,-.04],U:[-1,0,-.12],V:[-.18,-.22,-1],H:.17,C:.09,sweep:.09,falcate:.03,t0:.012}),E({name:`pelvicL`,o:[-.095,.03,.022],U:[-1,0,.1],V:[-.3,-.42,1],H:.082,C:.055,sweep:.05,falcate:.02,t0:.0075}),E({name:`pelvicR`,o:[-.095,.03,-.022],U:[-1,0,-.1],V:[-.3,-.42,-1],H:.082,C:.055,sweep:.05,falcate:.02,t0:.0075}),E({name:`anal`,o:[-.225,.052,0],U:[-1,0,0],V:[-.35,-1,0],H:.056,C:.05,sweep:.04,falcate:.015,t0:.007}),E({name:`caudalUpper`,o:[-.362,.09,0],U:[-.75,-1,0],V:[-1,.75,0],H:.3,C:.105,sweep:.02,lePow:1.5,falcate:.016,t0:.013,bury:.12,notch:{s:.8,w:.03,depth:.6}}),E({name:`caudalLower`,o:[-.39,.074,0],U:[-.55,1,0],V:[-1,-.55,0],H:.15,C:.066,sweep:.032,falcate:.024,t0:.011,bury:.15})].map(f);function ae(e,t,n){return o(C(e,t,n),re(e,t,n),.045)}T(0)-.004,te(0),ie(1),ie(-1);var oe=1.4,se={channels:2,weights(e,t,n,i){let o=a(.02,-.004,ae(e,t,n)),s=r(n/(v(r(e,-.42,.47))*.75),-1,1),c=a(.1,.2,e)*(1-a(.33,.4,e)),l=a(-.02,-.14,e)*(1-a(-.36,-.4,e)*.5);i[0]=s*c*o,i[1]=s*l*o},stiffness(e){return 1+1.6*a(.22,.4,e)+10*a(-.26,-.37,e)},friction(e){return 1-.92*a(.3,.4,e)},gravity(e,t,n){let i=r(e,-.42,.47),o=r((t-b(i))/y(i),-1,1);return Math.max(.15,1-oe*.5*o)*(1-.8*a(0,.035,ae(e,t,n)))},activation(e,t){t[0]=.28*Math.sin(2*Math.PI*e/5.2);let n=a(.15,.85,.5+.5*Math.sin(2*Math.PI*e/7+1.3));t[1]=.13*Math.sin(2*Math.PI*e/1.5)*n}},D=.0115,ce=3.4,O={c:[0,23.4,0],r:[12.8,10.9,11]},le={c:[0,9.4,-.6],r:[10,9,9.4]},ue={c:[0,7.4,1],r:[8.8,6.8,8.2]},k={y:20.6,z0:7,z1:12,rx:4.3,ry:3,round:1.05},de={x:1.5,rx:.68,ry:1.05},fe={x:7.8,y:19.8,rx:3,ry:2.1},A={c:[5.4,9.8,7.4],r:[2.5,2.8,2.6]},j={c:[4.4,4.6,6.6],r:[3.1,2.3,3.4]},pe=e=>{let t=[5.6*e,24.6,0],n=t[0]/O.r[0],r=(t[1]-O.c[1])/O.r[1];t[2]=O.r[2]*Math.sqrt(1-n*n-r*r);let i=m([t[0]/O.r[0]**2,(t[1]-O.c[1])/O.r[1]**2,t[2]/O.r[2]**2]),a=me[2]+.42,o=[t[0]-i[0]*a,t[1]-i[1]*a,t[2]-i[2]*a],s=m(h([0,1,0],i));return{o,u:s,v:h(i,s),w:i}},me=[1.45,1.95,1.05],he=[pe(1),pe(-1)],ge=e=>{let t=.17,n=.36*e,r=[Math.sin(n),Math.cos(n)*Math.cos(t),-Math.cos(n)*Math.sin(t)],i=6*e,a=i/O.r[0];return g([i,O.c[1]+O.r[1]*Math.sqrt(1-a*a)-1.6,-.6],r,[0,.15,1])},_e=[ge(1),ge(-1)],ve={hw:4.5,b:-3,apex:5.8,round:1.8,t:1.55},ye=e=>{let t=_e[e>0?0:1],n=ve.apex+.6;return[t.o[0]+t.v[0]*n,t.o[1]+t.v[1]*n,t.o[2]+t.v[2]*n]},be=[0,10.6,-11.2],xe=[];for(let e=0;e<=28;e++){let t=e/28*1.55*2*Math.PI,n=1.65-e/28*.25;xe.push([be[0]+n*Math.cos(t+2.4),be[1]+n*Math.sin(t+2.4),be[2]-.32*t])}var Se=[[-.6,10.4,-8.4],xe[0]];xe[xe.length-1];var Ce=(e,t,n,r)=>p(e-r.c[0],t-r.c[1],n-r.c[2],r.r[0],r.r[1],r.r[2]);function we(e,t,n,r=0){let i=k.round,a=c(e,t-k.y,k.rx+r-i,k.ry+r-i),o=(k.z0+k.z1)/2,s=(k.z1-k.z0)/2+r;return l(a+i,Math.abs(n-o)-s+i)-i}function Te(e,t,n){let r=Math.abs(e),i=o(Ce(e,t,n,le),Ce(e,t,n,ue),3);return i=o(i,Ce(e,t,n,O),4.2),i=o(i,p(r-A.c[0],t-A.c[1],n-A.c[2],A.r[0],A.r[1],A.r[2]),1.4),i=o(i,p(r-j.c[0],t-j.c[1],n-j.c[2],j.r[0],j.r[1],j.r[2]),1.6),i=o(i,we(e,t,n),1.3),s(i,ce-t,1)}var Ee=(e=>(t,n,r)=>e(t/D,n/D+ce,r/D)*D)(Te),M=e=>[e[0]*D,(e[1]-ce)*D,e[2]*D];M([0,k.y,k.z1-.3]),M(Se[0]).map((e,t)=>t===2?e-.012:e),M(ye(1)),M(ye(-1)),M([0,O.c[1]+O.r[1]-.8,0]),M([0,4.4,0]);var De=e=>e/D+ce,Oe=e=>_e[e].v,ke=e=>_e[e].w,Ae=1.2,je=.5,Me={channels:4,axes:[[0,0,1],Oe(0),Oe(1),[0,1,0]],weights(e,t,n,i){let o=e/D,s=De(t),c=n/D,l=a(7.5,3.5,Math.hypot(o*.8,(s-k.y)*1.1))*a(3,8,c);i[0]=r(o/2.5,-1,1)*l;for(let e=0;e<2;e++){let t=_e[e],n=o-t.o[0],l=s-t.o[1],u=c-t.o[2],d=n*t.v[0]+l*t.v[1]+u*t.v[2],f=n*ke(e)[0]+l*ke(e)[1]+u*ke(e)[2],p=e===0?o>1:o<-1;i[1+e]=p?r(f/1.2,-1,1)*a(-1.5,1.5,d):0}i[3]=a(O.c[1]+2,O.c[1]-8,s)*a(.03,-.005,Ee(e,t,n))},stiffness(e,t){return 3+.6*a(.1,.3,t)},gravity(e,t,n){let i=r(t/je*2-1,-1,1);return Math.max(.2,1-Ae*.5*i)*(1-.75*a(0,.03,Ee(e,t,n)))},activation(e,t){let n=e%4.6/4.6,r=a(0,.05,n)*(1-a(.18,.3,n));t[0]=.32*Math.sin(2*Math.PI*e*3.4)*r;let i=e=>{let t=(e%6.2+6.2)%6.2;return t<.9?Math.sin(Math.PI*t/.9)*Math.exp(-t*1.5):0};t[1]=.55*i(e-1.2),t[2]=.55*i(e-4.3);let o=e%7,s=e=>o>e&&o<e+.5?Math.sin(Math.PI*(o-e)/.5):0;t[3]=.09*(s(2.6)+.7*s(3.15))}},N=.0106,P=3.4,F={c:[0,29,.4],r:[12.8,10.6,10.8]},Ne={c:[0,12.6,-.6],r:[10.2,11,9.6]},Pe={c:[0,8.2,.8],r:[9.8,7.2,8.6]},I={c:[5.2,15.6,8],r:[2.8,2.5,2.8]},L={c:[4.5,4.7,6.8],r:[3,2.3,3.4]},R={eyeX:6.3,eyeY:29.9,eyeHW:2.4,eyeArch:1,eyeW:.42,mouthY:26.3,mouthR:.95,noseY:27.4,whiskX0:8.8,whiskX1:12,whiskY:26.9,whiskGap:.95,whiskW:.2,cheekX:6.7,cheekY:25.6,cheekRX:3.2,cheekRY:2.1},Fe=e=>{let t=.1,n=.27*e,r=[Math.sin(n),Math.cos(n)*Math.cos(t),-Math.cos(n)*Math.sin(t)],i=7*e,a=i/F.r[0];return g([i,F.c[1]+F.r[1]*Math.sqrt(1-a*a)-1.8,-.4],r,[0,.1,1])},Ie=[Fe(1),Fe(-1)],Le={hw:5,b:-3,apex:9.4,round:1.3,t:1.45},Re=e=>{let t=Ie[e>0?0:1],n=Le.apex+.5;return[t.o[0]+t.v[0]*n,t.o[1]+t.v[1]*n,t.o[2]+t.v[2]*n]},z=[[1.5,7,-7.4],[5.2,6,-10.2],[9.6,8.4,-10.4],[12,13.6,-9.4],[12.6,20,-8.6],[11.9,25.6,-8.2],[10.6,29.2,-8.4]],ze=[];for(let e=0;e<z.length-1;e++)for(let t=0;t<6;t++){let n=t/6,r=z[Math.max(0,e-1)],i=z[e],a=z[e+1],o=z[Math.min(z.length-1,e+2)],s=e=>.5*(2*i[e]+(-r[e]+a[e])*n+(2*r[e]-5*i[e]+4*a[e]-o[e])*n*n+(-r[e]+3*i[e]-3*a[e]+o[e])*n*n*n);ze.push([s(0),s(1),s(2)])}ze.push(z[z.length-1]);var Be=ze[ze.length-1],Ve=ze,He=(e,t,n,r)=>p(e-r.c[0],t-r.c[1],n-r.c[2],r.r[0],r.r[1],r.r[2]);function Ue(e,t,n){let r=Math.abs(e),i=o(He(e,t,n,Ne),He(e,t,n,Pe),3);return i=o(i,He(e,t,n,F),4),i=o(i,p(r-I.c[0],t-I.c[1],n-I.c[2],I.r[0],I.r[1],I.r[2]),1.3),i=o(i,p(r-L.c[0],t-L.c[1],n-L.c[2],L.r[0],L.r[1],L.r[2]),1.5),s(i,P-t,1)}var We=(e=>(t,n,r)=>e(t/N,n/N+P,r/N)*N)(Ue),B=e=>[e[0]*N,(e[1]-P)*N,e[2]*N],Ge=(e,t)=>{let n=e/F.r[0],r=(t-F.c[1])/F.r[1];return F.c[2]+F.r[2]*Math.sqrt(Math.max(0,1-n*n-r*r))};B(Re(1)),B(Re(-1)),B([R.whiskX1-.6,R.whiskY,Ge(R.whiskX1-.6,R.whiskY)-1]),B([-(R.whiskX1-.6),R.whiskY,Ge(R.whiskX1-.6,R.whiskY)-1]),B(Be),B([0,F.c[1]+F.r[1]-.8,0]);var Ke=e=>e/N+P,qe=1.2,Je=.42,Ye=e=>{let t=Ve[0],n=1e9;for(let r of Ve){let i=Math.abs(r[1]-e);i<n&&r[1]>9&&(n=i,t=r)}return t[0]},Xe={shark:se,pig:Me,cat:{channels:4,axes:[[0,1,0],[0,1,0],Ie[0].v,Ie[1].v],weights(e,t,n,i){let o=e/N,s=Ke(t),c=n/N;i[0]=a(-6,-7.8,c)*a(9,13,s)*a(8,10,o)*r((o-Ye(s))/1.4,-1,1),i[1]=a(F.c[1]-13,F.c[1]-8,s)*(1-a(F.c[1]-1,F.c[1]+3,s))*r(o/7,-1,1)*a(.02,-.005,We(e,t,n));for(let e=0;e<2;e++){let t=Ie[e],n=o-t.o[0],l=s-t.o[1],u=c-t.o[2],d=n*t.v[0]+l*t.v[1]+u*t.v[2],f=n*t.w[0]+l*t.w[1]+u*t.w[2],p=e===0?o>1:o<-1;i[2+e]=p?r(f/1.2,-1,1)*a(-1.5,1.5,d):0}},stiffness(e,t){return 3+.6*a(.1,.3,t)},gravity(e,t,n){let i=r(t/Je*2-1,-1,1);return Math.max(.2,1-qe*.5*i)*(1-.8*a(0,.03,We(e,t,n)))},activation(e,t){t[0]=.3*(.55+.45*a(.3,.9,.5+.5*Math.sin(2*Math.PI*e/9)))*Math.sin(2*Math.PI*e/2.2);let n=(e+2)%16/16,r=e=>a(e,e+.06,n)*(1-a(e+.2,e+.28,n));t[1]=.16*(r(.05)-r(.55));let i=(e,t)=>{let n=(e%t+t)%t;return n<.5?Math.sin(Math.PI*n/.5)*Math.exp(-n*2):0};t[2]=.5*i(e-.8,5.3),t[3]=.5*i(e-3.4,6.7)}}},Ze={colourways:[{id:`steel`,label:`Steel`,zh:`钢灰`,absorb:[5,3,1.9],back:[.42,.5,.58,.6],finTip:[.2,.24,.3,.8],belly:[.93,.935,.93,1],glow:[.62,.78,.92,1],bead:[.95,.45,.32,1],swatch:`#7d8b97`,bgTop:[.5,.5,.495],bgBot:[.36,.36,.355],floor:[.66,.655,.645]},{id:`amber`,label:`Amber`,zh:`琥珀`,absorb:[.5,2.8,9],back:[.62,.38,.14,.55],finTip:[.35,.18,.06,.8],belly:[.98,.93,.82,1],glow:[1,.7,.3,1],bead:[.85,.15,.2,1],swatch:`#c98a2e`,bgTop:[.52,.505,.49],bgBot:[.37,.36,.35],floor:[.67,.655,.635]},{id:`gummy`,label:`Gummy Blue`,zh:`软糖蓝`,absorb:[13,4.6,.8],back:[.18,.33,.78,.6],finTip:[.05,.1,.4,.8],belly:[.9,.94,1,1],glow:[.35,.62,1,1],bead:[1,.55,.15,1],swatch:`#2f63d6`,bgTop:[.5,.505,.51],bgBot:[.355,.36,.365],floor:[.655,.66,.665]}],shellGLSL:`
float hammerFront(float z){ float q = abs(z)/0.226; return 0.505 - 0.018*q*q - 0.0085*exp(-(z*z)/(0.011*0.011)); }
vec4 shellPattern(vec3 X, vec3 Nr, vec4 A) {
  float secV = A.x * 4.0 - 2.0; float fin = A.y; float tip = A.z;
  float back = smoothstep(-0.25, 0.85, secV);
  back = max(back, fin * smoothstep(0.10, 0.20, X.y) * 0.85);   // dorsal fins dark too
  // five gill slits, drawn from rest space
  float gill = 0.0;
  for (int k = 0; k < 5; k++) {
    float xk = 0.318 - float(k) * 0.0150;
    float xc = xk - 0.008 * secV * secV + 0.004 * secV;
    float w = 0.0009 + 0.0006 * (1.0 - abs(secV));
    float d = abs(X.x - xc);
    float span = 1.0 - smoothstep(0.38, 0.62, abs(secV + 0.05 + float(k) * 0.02));
    gill = max(gill, (1.0 - smoothstep(w * 0.4, w, d)) * span);
  }
  gill *= smoothstep(0.30, 0.55, abs(Nr.z)) * (1.0 - fin);
  // narial grooves running along the front of the hammer
  float du = hammerFront(X.z) - X.x;
  float gz = smoothstep(0.018, 0.04, abs(X.z)) * (1.0 - smoothstep(0.19, 0.215, abs(X.z)));
  float groove = (1.0 - smoothstep(0.0005, 0.0011, abs(du - 0.0062 - 0.004 * abs(X.z)))) * gz;
  groove += (1.0 - smoothstep(0.0004, 0.0009, abs(du - 0.0125 - 0.006 * abs(X.z)))) * gz * 0.6;
  groove *= smoothstep(0.38, 0.44, X.x) * smoothstep(-0.2, 0.3, Nr.y);
  return vec4(back, gill, tip, groove);
}
`,innerGLSL:`
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 innerPattern(vec3 X, vec3 Nr) {
  vec3 eyeC = vec3(0.465, 0.048, sign(X.z) * 0.218);
  float eye = 1.0 - smoothstep(0.0148, 0.0158, length(X - eyeC));
  float down = smoothstep(-0.25, -0.6, Nr.y);
  // mouth: crescent on the underside of the head
  vec2 mc = vec2(0.392, 0.0); vec2 q = X.xz - mc;
  float r = length(q); float th = atan(q.y, q.x);
  float arc = abs(r - 0.042);
  float inArc = 1.0 - smoothstep(0.62, 0.78, abs(th));
  float mouth = (1.0 - smoothstep(0.0016, 0.0026, arc)) * inArc * down;
  // teeth: small milky triangles along the crescent
  float tt = fract(th * 30.0 / 3.14159);
  float tooth = (1.0 - smoothstep(0.0, 0.0018 * (1.0 - abs(tt * 2.0 - 1.0)) + 0.0002, abs(r - 0.0418))) * step(0.0, 0.0) ;
  tooth *= inArc * down * step(0.5, 1.0 - abs(tt * 2.0 - 1.0) + 0.25);
  // ampullary pores beneath the hammer
  vec2 cell = X.xz / 0.0062; vec2 ci = floor(cell); vec2 cf = fract(cell) - 0.5;
  vec2 jit = vec2(hash21(ci), hash21(ci + 7.1)) - 0.5;
  float pr = length(cf - jit * 0.6) * 0.0062;
  float du = hammerFront(X.z) - X.x;
  float poreZone = down * smoothstep(0.37, 0.42, X.x) * (1.0 - smoothstep(0.035, 0.06, du)) * step(0.35, hash21(ci + 3.3));
  float pore = (1.0 - smoothstep(0.00045, 0.0008, pr)) * poreZone;
  vec3 alb = vec3(1.0);
  alb *= 1.0 - mouth * 0.82;
  alb = mix(alb, vec3(1.08), tooth * mouth);
  alb *= 1.0 - pore * 0.55;
  return vec4(alb, eye);
}
`,shellWGSL:`
fn hammerFront(z: f32) -> f32 { let q = abs(z)/0.226; return 0.505 - 0.018*q*q - 0.0085*exp(-(z*z)/(0.011*0.011)); }
fn shellPattern(X: vec3f, Nr: vec3f, A: vec4f) -> vec4f {
  let secV = A.x * 4.0 - 2.0; let fin = A.y; let tip = A.z;
  var back = smoothstep(-0.25, 0.85, secV);
  back = max(back, fin * smoothstep(0.10, 0.20, X.y) * 0.85);
  var gill = 0.0;
  for (var k = 0; k < 5; k++) {
    let xk = 0.318 - f32(k) * 0.0150;
    let xc = xk - 0.008 * secV * secV + 0.004 * secV;
    let w = 0.0009 + 0.0006 * (1.0 - abs(secV));
    let d = abs(X.x - xc);
    let span = 1.0 - smoothstep(0.38, 0.62, abs(secV + 0.05 + f32(k) * 0.02));
    gill = max(gill, (1.0 - smoothstep(w * 0.4, w, d)) * span);
  }
  gill *= smoothstep(0.30, 0.55, abs(Nr.z)) * (1.0 - fin);
  let du = hammerFront(X.z) - X.x;
  let gz = smoothstep(0.018, 0.04, abs(X.z)) * (1.0 - smoothstep(0.19, 0.215, abs(X.z)));
  var groove = (1.0 - smoothstep(0.0005, 0.0011, abs(du - 0.0062 - 0.004 * abs(X.z)))) * gz;
  groove += (1.0 - smoothstep(0.0004, 0.0009, abs(du - 0.0125 - 0.006 * abs(X.z)))) * gz * 0.6;
  groove *= smoothstep(0.38, 0.44, X.x) * smoothstep(-0.2, 0.3, Nr.y);
  return vec4f(back, gill, tip, groove);
}
`,innerWGSL:`
fn hash21(p0: vec2f) -> f32 { var p = fract(p0 * vec2f(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
fn innerPattern(X: vec3f, Nr: vec3f) -> vec4f {
  let eyeC = vec3f(0.465, 0.048, sign(X.z) * 0.218);
  let eye = 1.0 - smoothstep(0.0148, 0.0158, length(X - eyeC));
  let down = smoothstep(-0.25, -0.6, Nr.y);
  let mc = vec2f(0.392, 0.0); let q = X.xz - mc;
  let r = length(q); let th = atan2(q.y, q.x);
  let arc = abs(r - 0.042);
  let inArc = 1.0 - smoothstep(0.62, 0.78, abs(th));
  let mouth = (1.0 - smoothstep(0.0016, 0.0026, arc)) * inArc * down;
  let tt = fract(th * 30.0 / 3.14159);
  var tooth = (1.0 - smoothstep(0.0, 0.0018 * (1.0 - abs(tt * 2.0 - 1.0)) + 0.0002, abs(r - 0.0418)));
  tooth *= inArc * down * step(0.5, 1.0 - abs(tt * 2.0 - 1.0) + 0.25);
  let cell = X.xz / 0.0062; let ci = floor(cell); let cf = fract(cell) - 0.5;
  let jit = vec2f(hash21(ci), hash21(ci + 7.1)) - 0.5;
  let pr = length(cf - jit * 0.6) * 0.0062;
  let du = hammerFront(X.z) - X.x;
  let poreZone = down * smoothstep(0.37, 0.42, X.x) * (1.0 - smoothstep(0.035, 0.06, du)) * step(0.35, hash21(ci + 3.3));
  let pore = (1.0 - smoothstep(0.00045, 0.0008, pr)) * poreZone;
  var alb = vec3f(1.0);
  alb *= 1.0 - mouth * 0.82;
  alb = mix(alb, vec3f(1.08), tooth * mouth);
  alb *= 1.0 - pore * 0.55;
  return vec4f(alb, eye);
}
`},V=e=>Number.isInteger(e)?e.toFixed(1):e.toFixed(5),H=e=>`vec3(${V(e[0])}, ${V(e[1])}, ${V(e[2])})`;function Qe(e){return e.replace(/\b(float|vec2|vec3|vec4)\s+(\w+)\s*=/g,`var $2 =`).replace(/\bvec([234])\(/g,`vec$1f(`)}function $e(e,t,n,r=``){let i=`${r}\nvec4 ${e}(${t.map(([e,t])=>`${t} ${e}`).join(`, `)}) {\n${n}\n}\n`,a=e=>e===`float`?`f32`:e+`f`;return{glsl:i,wgsl:`${Qe(r.replace(/\bfloat (\w+)\s*\(([^)]*)\)\s*\{/g,(e,t,n)=>`fn ${t}(${n.split(`,`).filter(Boolean).map(e=>{let[t,n]=e.trim().split(/\s+/);return`${n}: ${a(t)}`}).join(`, `)}) -> f32 {`))}\nfn ${e}(${t.map(([e,t])=>`${e}: ${a(t)}`).join(`, `)}) -> vec4f {\n${Qe(n)}\n}\n`}}var et={bgTop:[.5,.5,.495],bgBot:[.36,.36,.355],floor:[.66,.655,.645]},tt=[{id:`strawberry`,label:`Strawberry`,zh:`草莓`,absorb:[.9,8.5,5.2],back:[.96,.52,.62,.85],finTip:[.95,.55,.66,.5],belly:[1,.84,.87,1],glow:[1,.6,.68,1],bead:[.98,.8,.3,1],swatch:`#f0a1b2`,...et},{id:`peach`,label:`Peach`,zh:`蜜桃`,absorb:[.55,3,6.2],back:[1,.58,.5,.8],finTip:[1,.62,.52,.5],belly:[1,.89,.81,1],glow:[1,.72,.55,1],bead:[.55,.78,.36,1],swatch:`#f4b48f`,...et},{id:`milk`,label:`Milk`,zh:`牛奶`,absorb:[.45,.55,.7],back:[.98,.58,.68,.85],finTip:[.97,.7,.76,.5],belly:[.985,.975,.965,1],glow:[1,.9,.88,1],bead:[.95,.42,.5,1],swatch:`#efebe4`,...et}],U=he,nt=$e(`innerPattern`,[[`X`,`vec3`],[`Nr`,`vec3`]],`
  vec3 b = X / ${V(D)} + vec3(0.0, ${V(ce)}, 0.0);
  float sd = step(0.0, b.x);
  vec3 eo = mix(${H(U[1].o)}, ${H(U[0].o)}, sd);
  vec3 eu = mix(${H(U[1].u)}, ${H(U[0].u)}, sd);
  vec3 ev = mix(${H(U[1].v)}, ${H(U[0].v)}, sd);
  vec3 ew = mix(${H(U[1].w)}, ${H(U[0].w)}, sd);
  vec3 d = b - eo;
  vec3 q = vec3(dot(d, eu), dot(d, ev), dot(d, ew)) / ${H(me)};
  float eye = 1.0 - smoothstep(1.03, 1.12, length(q));
  float e = length(vec2(b.x / ${V(k.rx-.5)}, (b.y - ${V(k.y)}) / ${V(k.ry-.5)}));
  float snout = (1.0 - smoothstep(0.97, 1.08, e)) * smoothstep(${V(k.z0+1.2)}, ${V(k.z0+2.4)}, b.z);
  float front = smoothstep(0.5, 0.8, Nr.z);
  float nos = 1.0 - smoothstep(0.86, 1.0, length(vec2((abs(b.x) - ${V(de.x)}) / ${V(de.rx)}, (b.y - ${V(k.y)}) / ${V(de.ry)})));
  nos = nos * front * snout;
  float rim = (1.0 - smoothstep(0.0, 0.07, abs(e - 0.9))) * front * snout * 0.35;
  float ch = 1.0 - smoothstep(0.45, 1.05, length(vec2((abs(b.x) - ${V(fe.x)}) / ${V(fe.rx)}, (b.y - ${V(fe.y)}) / ${V(fe.ry)})));
  ch = ch * smoothstep(2.0, 5.5, b.z) * (1.0 - snout);
  vec3 alb = vec3(1.0);
  alb = mix(alb, vec3(0.97, 0.66, 0.75), snout);
  alb = mix(alb, vec3(0.98, 0.50, 0.60), ch * 0.85);
  alb = alb * (1.0 - rim);
  alb = mix(alb, vec3(0.20, 0.11, 0.13), nos);
  return vec4(alb, eye);`),rt=$e(`shellPattern`,[[`X`,`vec3`],[`Nr`,`vec3`],[`A`,`vec4`]],`
  return vec4(A.z, 0.0, A.w * 0.7, 0.0);`),it={colourways:tt,shellGLSL:rt.glsl,innerGLSL:nt.glsl,shellWGSL:rt.wgsl,innerWGSL:nt.wgsl},at={bgTop:[.5,.5,.495],bgBot:[.36,.36,.355],floor:[.66,.655,.645]},ot=[{id:`cream`,label:`Cream`,zh:`奶油`,absorb:[.45,1.1,2.9],back:[.97,.6,.7,.85],finTip:[.97,.6,.7,.9],belly:[1,.965,.91,1],glow:[1,.88,.7,1],bead:[.4,.62,.95,1],swatch:`#f1e3c8`,...at},{id:`mint`,label:`Mint`,zh:`薄荷`,absorb:[3.2,.75,1.7],back:[.97,.62,.72,.85],finTip:[.97,.62,.72,.9],belly:[.95,1,.97,1],glow:[.7,1,.86,1],bead:[.98,.55,.45,1],swatch:`#b9e3cf`,...at},{id:`lavender`,label:`Lavender`,zh:`薰衣草`,absorb:[1.5,2.3,.6],back:[.98,.6,.74,.85],finTip:[.98,.6,.74,.9],belly:[.97,.955,1,1],glow:[.86,.78,1,1],bead:[.98,.8,.35,1],swatch:`#cbbfec`,...at}],W=R,st=$e(`innerPattern`,[[`X`,`vec3`],[`Nr`,`vec3`]],`
  vec3 b = X / ${V(N)} + vec3(0.0, ${V(P)}, 0.0);
  float ax = abs(b.x);
  float face = smoothstep(2.0, 5.0, b.z);
  // sleepy closed eyes: thick arcs, tapering at the ends
  float t = clamp((ax - ${V(W.eyeX)}) / ${V(W.eyeHW)}, -1.0, 1.0);
  float cy = ${V(W.eyeY)} + ${V(W.eyeArch)} * (1.0 - t * t);
  float ex = max(abs(ax - ${V(W.eyeX)}) - ${V(W.eyeHW)}, 0.0);
  float ed = length(vec2(ex, b.y - cy));
  float eyes = (1.0 - smoothstep(${V(W.eyeW)} * (1.0 - 0.45 * t * t), ${V(W.eyeW)} * (1.0 - 0.45 * t * t) + 0.16, ed)) * face;
  // ω mouth: two little lower arcs
  vec2 mq = vec2(ax - ${V(W.mouthR)}, b.y - ${V(W.mouthY+.35)});
  float md = abs(length(mq) - ${V(W.mouthR)});
  float mouth = (1.0 - smoothstep(0.17, 0.3, md)) * smoothstep(0.25, -0.15, mq.y) * face * (1.0 - smoothstep(${V(W.mouthR*2.2)}, ${V(W.mouthR*2.4)}, ax));
  // a tiny pink nose
  float nose = 1.0 - smoothstep(0.85, 1.0, length(vec2(b.x / 0.75, (b.y - ${V(W.noseY)}) / 0.5)));
  nose = nose * face;
  // whiskers: three per side, fanning out
  float wk = 0.0;
  float wx = clamp((ax - ${V(W.whiskX0)}) / ${V(W.whiskX1-W.whiskX0)}, 0.0, 1.0);
  float win = smoothstep(${V(W.whiskX0-.3)}, ${V(W.whiskX0+.3)}, ax) * (1.0 - smoothstep(${V(W.whiskX1-.3)}, ${V(W.whiskX1+.2)}, ax));
  float w0 = abs(b.y - (${V(W.whiskY+W.whiskGap)} + 0.9 * wx));
  float w1 = abs(b.y - (${V(W.whiskY)} + 0.1 * wx));
  float w2 = abs(b.y - (${V(W.whiskY-W.whiskGap)} - 0.7 * wx));
  wk = (1.0 - smoothstep(${V(W.whiskW)}, ${V(W.whiskW+.14)}, min(w0, min(w1, w2)))) * win * smoothstep(0.0, 3.0, b.z);
  float ch = 1.0 - smoothstep(0.4, 1.05, length(vec2((ax - ${V(W.cheekX)}) / ${V(W.cheekRX)}, (b.y - ${V(W.cheekY)}) / ${V(W.cheekRY)})));
  ch = ch * face;
  vec3 alb = vec3(1.0);
  alb = mix(alb, vec3(1.0, 0.66, 0.74), ch * 0.8);
  alb = mix(alb, vec3(0.95, 0.55, 0.64), nose);
  alb = mix(alb, vec3(0.50, 0.50, 0.54), wk);
  alb = mix(alb, vec3(0.10, 0.085, 0.09), max(eyes, mouth));
  return vec4(alb, 0.0);`),ct=$e(`shellPattern`,[[`X`,`vec3`],[`Nr`,`vec3`],[`A`,`vec4`]],`
  return vec4(A.z + A.w, 0.0, A.w, 0.0);`),lt={colourways:ot,shellGLSL:ct.glsl,innerGLSL:st.glsl,shellWGSL:ct.wgsl,innerWGSL:st.wgsl},ut=[{id:`shark`,name:`Great Hammerhead`,zh:`鲨`,subtitle:`果冻标本 · 无沟双髻鲨`,num:`1`,ready:!0,actuation:Xe.shark,look:Ze,colourways:Ze.colourways,camera:{target:[-.03,.085,0],yaw:.62,pitch:.42,mobileYaw:1.3,mobilePitch:.6,legacyFit:!0},idle:{at:[.47,.045,0],lift:[.02,.075,0],period:13,duration:3.2,radius:.13,offset:6},metrics:[{id:`fork`,label:`Fork length`,zh:`叉长`,a:`snout`,b:`fork`,decimals:2},{id:`eyes`,label:`Eye to eye`,zh:`眼距`,a:`eyeL`,b:`eyeR`,decimals:2}]},{id:`pig`,name:`Little Pig`,zh:`猪`,subtitle:`果冻标本 · 小粉猪`,num:`2`,ready:!0,actuation:Xe.pig,look:it,colourways:it.colourways,camera:{target:[0,.22,0],yaw:.2,pitch:.22,mobileYaw:.16,mobilePitch:.2},metrics:[{id:`ears`,label:`Ear span`,zh:`耳距`,a:`earL`,b:`earR`,decimals:2},{id:`snout`,label:`Snout to tail`,zh:`鼻尾`,a:`snout`,b:`tail`,decimals:2}]},{id:`cat`,name:`Sleepy Cat`,zh:`猫`,subtitle:`果冻标本 · 困困猫`,num:`3`,ready:!0,actuation:Xe.cat,look:lt,colourways:lt.colourways,camera:{target:[0,.22,0],yaw:.16,pitch:.2,mobileYaw:.12,mobilePitch:.18},metrics:[{id:`ears`,label:`Ear-tip span`,zh:`耳尖距`,a:`earL`,b:`earR`,decimals:2},{id:`whiskers`,label:`Whisker span`,zh:`须宽`,a:`whiskL`,b:`whiskR`,decimals:2}]}],G={create(){let e=new Float32Array(16);return e[0]=e[5]=e[10]=e[15]=1,e},perspective(e,t,n,r,i,a){let o=1/Math.tan(t/2);return e.fill(0),e[0]=o/n,e[5]=o,e[11]=-1,a?(e[10]=i/(r-i),e[14]=i*r/(r-i)):(e[10]=(i+r)/(r-i),e[14]=2*i*r/(r-i)),e},ortho(e,t,n,r,i,a,o,s){return e.fill(0),e[0]=2/(n-t),e[5]=2/(i-r),e[12]=-(n+t)/(n-t),e[13]=-(i+r)/(i-r),e[15]=1,s?(e[10]=-1/(o-a),e[14]=-a/(o-a)):(e[10]=-2/(o-a),e[14]=-(o+a)/(o-a)),e},lookAt(e,t,n,r){let i=t[0]-n[0],a=t[1]-n[1],o=t[2]-n[2],s=Math.hypot(i,a,o);i/=s,a/=s,o/=s;let c=r[1]*o-r[2]*a,l=r[2]*i-r[0]*o,u=r[0]*a-r[1]*i;s=Math.hypot(c,l,u),c/=s,l/=s,u/=s;let d=a*u-o*l,f=o*c-i*u,p=i*l-a*c;return e[0]=c,e[1]=d,e[2]=i,e[3]=0,e[4]=l,e[5]=f,e[6]=a,e[7]=0,e[8]=u,e[9]=p,e[10]=o,e[11]=0,e[12]=-(c*t[0]+l*t[1]+u*t[2]),e[13]=-(d*t[0]+f*t[1]+p*t[2]),e[14]=-(i*t[0]+a*t[1]+o*t[2]),e[15]=1,e},mul(e,t,n){let r=new Float32Array(16);for(let e=0;e<4;e++)for(let i=0;i<4;i++)r[e*4+i]=t[i]*n[e*4]+t[4+i]*n[e*4+1]+t[8+i]*n[e*4+2]+t[12+i]*n[e*4+3];return e.set(r),e},invert(e,t){let n=t,r=new Float32Array(16);r[0]=n[5]*n[10]*n[15]-n[5]*n[11]*n[14]-n[9]*n[6]*n[15]+n[9]*n[7]*n[14]+n[13]*n[6]*n[11]-n[13]*n[7]*n[10],r[4]=-n[4]*n[10]*n[15]+n[4]*n[11]*n[14]+n[8]*n[6]*n[15]-n[8]*n[7]*n[14]-n[12]*n[6]*n[11]+n[12]*n[7]*n[10],r[8]=n[4]*n[9]*n[15]-n[4]*n[11]*n[13]-n[8]*n[5]*n[15]+n[8]*n[7]*n[13]+n[12]*n[5]*n[11]-n[12]*n[7]*n[9],r[12]=-n[4]*n[9]*n[14]+n[4]*n[10]*n[13]+n[8]*n[5]*n[14]-n[8]*n[6]*n[13]-n[12]*n[5]*n[10]+n[12]*n[6]*n[9],r[1]=-n[1]*n[10]*n[15]+n[1]*n[11]*n[14]+n[9]*n[2]*n[15]-n[9]*n[3]*n[14]-n[13]*n[2]*n[11]+n[13]*n[3]*n[10],r[5]=n[0]*n[10]*n[15]-n[0]*n[11]*n[14]-n[8]*n[2]*n[15]+n[8]*n[3]*n[14]+n[12]*n[2]*n[11]-n[12]*n[3]*n[10],r[9]=-n[0]*n[9]*n[15]+n[0]*n[11]*n[13]+n[8]*n[1]*n[15]-n[8]*n[3]*n[13]-n[12]*n[1]*n[11]+n[12]*n[3]*n[9],r[13]=n[0]*n[9]*n[14]-n[0]*n[10]*n[13]-n[8]*n[1]*n[14]+n[8]*n[2]*n[13]+n[12]*n[1]*n[10]-n[12]*n[2]*n[9],r[2]=n[1]*n[6]*n[15]-n[1]*n[7]*n[14]-n[5]*n[2]*n[15]+n[5]*n[3]*n[14]+n[13]*n[2]*n[7]-n[13]*n[3]*n[6],r[6]=-n[0]*n[6]*n[15]+n[0]*n[7]*n[14]+n[4]*n[2]*n[15]-n[4]*n[3]*n[14]-n[12]*n[2]*n[7]+n[12]*n[3]*n[6],r[10]=n[0]*n[5]*n[15]-n[0]*n[7]*n[13]-n[4]*n[1]*n[15]+n[4]*n[3]*n[13]+n[12]*n[1]*n[7]-n[12]*n[3]*n[5],r[14]=-n[0]*n[5]*n[14]+n[0]*n[6]*n[13]+n[4]*n[1]*n[14]-n[4]*n[2]*n[13]-n[12]*n[1]*n[6]+n[12]*n[2]*n[5],r[3]=-n[1]*n[6]*n[11]+n[1]*n[7]*n[10]+n[5]*n[2]*n[11]-n[5]*n[3]*n[10]-n[9]*n[2]*n[7]+n[9]*n[3]*n[6],r[7]=n[0]*n[6]*n[11]-n[0]*n[7]*n[10]-n[4]*n[2]*n[11]+n[4]*n[3]*n[10]+n[8]*n[2]*n[7]-n[8]*n[3]*n[6],r[11]=-n[0]*n[5]*n[11]+n[0]*n[7]*n[9]+n[4]*n[1]*n[11]-n[4]*n[3]*n[9]-n[8]*n[1]*n[7]+n[8]*n[3]*n[5],r[15]=n[0]*n[5]*n[10]-n[0]*n[6]*n[9]-n[4]*n[1]*n[10]+n[4]*n[2]*n[9]+n[8]*n[1]*n[6]-n[8]*n[2]*n[5];let i=n[0]*r[0]+n[1]*r[4]+n[2]*r[8]+n[3]*r[12];i=1/i;for(let t=0;t<16;t++)e[t]=r[t]*i;return e},transformPoint(e,t,n,r){return[e[0]*t+e[4]*n+e[8]*r+e[12],e[1]*t+e[5]*n+e[9]*r+e[13],e[2]*t+e[6]*n+e[10]*r+e[14],e[3]*t+e[7]*n+e[11]*r+e[15]]}},K={viewProj:0,view:16,proj:32,invViewProj:48,lightVP:64,camPos:80,res:84,qmin:88,qext:92,absorb:96,backCol:100,finTipCol:104,bellyCol:108,glowCol:112,studio:116,misc:120,beadCol:124,beads:128,lightDir:192,bgTop:196,bgBot:200,extra:204},dt=`
layout(std140) uniform Frame {
  mat4 viewProj; mat4 view; mat4 proj; mat4 invViewProj; mat4 lightVP;
  vec4 camPos; vec4 res; vec4 qmin; vec4 qext; vec4 absorb; vec4 backCol; vec4 finTipCol; vec4 bellyCol; vec4 glowCol;
  vec4 studio; vec4 misc; vec4 beadCol; vec4 beads[16]; vec4 lightDir; vec4 bgTop; vec4 bgBot; vec4 extra;
} fr;
`,ft=`
struct Frame {
  viewProj: mat4x4f, view: mat4x4f, proj: mat4x4f, invViewProj: mat4x4f, lightVP: mat4x4f,
  camPos: vec4f, res: vec4f, qmin: vec4f, qext: vec4f, absorb: vec4f, backCol: vec4f, finTipCol: vec4f, bellyCol: vec4f, glowCol: vec4f,
  studio: vec4f, misc: vec4f, beadCol: vec4f, beads: array<vec4f, 16>, lightDir: vec4f, bgTop: vec4f, bgBot: vec4f, extra: vec4f,
};
`,pt={gravity:39.2,density:1,muBody:90,muFin:2500,lambdaRatio:150,damping:1.2,substeps:10,frictionStatic:1.2,frictionKinetic:.9,grabStiffness:.12};function mt(e){"@babel/helpers - typeof";return mt=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},mt(e)}function ht(e,t){if(mt(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(mt(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function gt(e){var t=ht(e,`string`);return mt(t)==`symbol`?t:t+``}function q(e,t,n){return(t=gt(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function _t(e){return{active:!1,count:0,idx:new Int32Array(e),off:new Float32Array(e*3),wt:new Float32Array(e),target:new Float32Array(3),twist:0,axis:new Float32Array([0,0,1])}}var vt=class{constructor(){q(this,`pos`,new Float32Array(64)),q(this,`vel`,new Float32Array(48)),q(this,`count`,0),q(this,`next`,0)}spawn(e,t,n,r){let i;this.count<16?i=this.count++:(i=this.next,this.next=(this.next+1)%16),this.pos.set([e,t,n,r],4*i),this.vel.set([0,0,0],3*i)}clear(){this.count=0,this.next=0}step(e,t,n,r,i,a){let o=Math.min(e,1/30)/4,s=this.pos,c=this.vel;for(let e=0;e<4;e++){for(let e=0;e<this.count;e++){c[3*e+1]-=a*o;let l=Math.exp(-.8*o);c[3*e]*=l,c[3*e+1]*=l,c[3*e+2]*=l,s[4*e]+=c[3*e]*o,s[4*e+1]+=c[3*e+1]*o,s[4*e+2]+=c[3*e+2]*o;let u=s[4*e+3];if(s[4*e+1]<u){s[4*e+1]=u,c[3*e+1]<0&&(c[3*e+1]*=-.25);let t=Math.exp(-9*o);c[3*e]*=t,c[3*e+2]*=t}if(t){let a=0,l=0,d=0,f=0;for(let o=0;o<r;o++){let r=o*n,c=s[4*e]-t[r],p=s[4*e+1]-t[r+1],m=s[4*e+2]-t[r+2],h=u+i,g=c*c+p*p+m*m;if(g<h*h&&g>1e-12){let e=Math.sqrt(g),t=h-e;a+=c/e*t,l+=p/e*t,d+=m/e*t,f++}}if(f){let t=.5/Math.sqrt(f);s[4*e]+=a*t,s[4*e+1]+=l*t,s[4*e+2]+=d*t;let n=Math.hypot(a,l,d)||1,r=a/n,i=l/n,u=d/n,p=c[3*e]*r+c[3*e+1]*i+c[3*e+2]*u;p<0&&(c[3*e]-=p*r*1.2,c[3*e+1]-=p*i*1.2,c[3*e+2]-=p*u*1.2);let m=Math.exp(-5*o);c[3*e]*=m,c[3*e+2]*=m}}}for(let e=0;e<this.count;e++)for(let t=e+1;t<this.count;t++){let n=s[4*e]-s[4*t],r=s[4*e+1]-s[4*t+1],i=s[4*e+2]-s[4*t+2],a=s[4*e+3]+s[4*t+3],o=n*n+r*r+i*i;if(o<a*a&&o>1e-12){let c=Math.sqrt(o),l=(a-c)/c*.5;s[4*e]+=n*l,s[4*e+1]+=r*l,s[4*e+2]+=i*l,s[4*t]-=n*l,s[4*t+1]-=r*l,s[4*t+2]-=i*l}}}}},yt=class{constructor(e,t=600,n=380,r=.6){q(this,`strength`,void 0),q(this,`delay`,void 0),q(this,`idx`,void 0),q(this,`q`,void 0),q(this,`tipped`,0),q(this,`active`,!1),q(this,`t0`,0),q(this,`prevAng`,-1),q(this,`kd`,.22),this.strength=n,this.delay=r;let i=e.length/3,a=Math.max(1,Math.floor(i/t)),o=[];for(let e=0;e<i;e+=a)o.push(e);this.idx=new Uint32Array(o);let s=[0,0,0];for(let t of o)for(let n=0;n<3;n++)s[n]+=e[3*t+n]/o.length;this.q=new Float32Array(o.length*3),o.forEach((t,n)=>{for(let r=0;r<3;r++)this.q[3*n+r]=e[3*t+r]-s[r]})}update(e,t,n,r,i){let a=this.idx.length,o=0,s=0,c=0;for(let n=0;n<a;n++){let r=this.idx[n]*t;o+=e[r],s+=e[r+1],c+=e[r+2]}o/=a,s/=a,c/=a;let l=[0,0,0,0,0,0,0,0,0],u=this.q;for(let n=0;n<a;n++){let r=this.idx[n]*t,i=[e[r]-o,e[r+1]-s,e[r+2]-c];for(let e=0;e<3;e++)for(let t=0;t<3;t++)l[3*e+t]+=i[e]*u[3*n+t]}let d=l.slice();for(let e=0;e<12;e++){let[e,t,n,r,i,a,o,s,c]=d,l=e*(i*c-a*s)-t*(r*c-a*o)+n*(r*s-i*o);if(Math.abs(l)<1e-12)break;let u=[(i*c-a*s)/l,-(r*c-a*o)/l,(r*s-i*o)/l,-(t*c-n*s)/l,(e*c-n*o)/l,-(e*s-t*o)/l,(t*a-n*i)/l,-(e*a-n*r)/l,(e*i-t*r)/l];d=d.map((e,t)=>.5*(e+u[t]))}let f=d[1],p=d[4],m=d[7],h=Math.hypot(f,p,m)||1;f/=h,p/=h,m/=h;let g=Math.acos(Math.max(-1,Math.min(1,p)));i.fill(0),i[3]=o,i[4]=s,i[5]=c;let _=this.prevAng<0?0:(g-this.prevAng)/Math.max(n,.001);if(this.prevAng=g,r?(this.tipped=0,this.active=!1):this.active?g<.12&&Math.abs(_)<.6&&(this.active=!1,this.tipped=0):(this.tipped=g<.45?0:this.tipped+n,this.tipped>this.delay&&(this.active=!0,this.t0=0)),this.active){this.t0+=n;let e=-m,t=f,r=Math.hypot(e,t);r<.001&&(e=1,t=0,r=1);let a=Math.min(1,this.t0/.4),o=this.strength*a*Math.min(1,g/.6)+this.strength*this.kd*_;o=Math.max(-.6*this.strength,Math.min(this.strength,o)),i[0]=e/r*o,i[2]=t/r*o}return g}},bt=[-.28,1,-.62],xt=class{constructor(e,t,n,r,i,a=!1){q(this,`canvas`,void 0),q(this,`path`,void 0),q(this,`dprCap`,void 0),q(this,`zeroToOne`,void 0),q(this,`mobilePortrait`,void 0),q(this,`frame`,new Float32Array(208)),q(this,`view`,G.create()),q(this,`proj`,G.create()),q(this,`vp`,G.create()),q(this,`ivp`,G.create()),q(this,`lvp`,G.create()),q(this,`cam`,{yaw:.62,pitch:.42,zoom:1,target:[-.03,.085,0],eye:[0,0,0],fov:.5}),q(this,`camGoal`,{yaw:.62,pitch:.42,zoom:1}),q(this,`grab`,_t(64)),q(this,`beads`,new vt),q(this,`spin`,new Float32Array(6)),q(this,`righting`,null),q(this,`tilt`,0),q(this,`idle`,null),q(this,`idleT`,0),q(this,`autoGrab`,!1),q(this,`autoP0`,[0,0,0]),q(this,`act`,void 0),q(this,`actuation`,void 0),q(this,`simTime`,0),q(this,`last`,0),q(this,`running`,!1),q(this,`time`,0),q(this,`colour`,void 0),q(this,`colourMix`,1),q(this,`prevColour`,void 0),q(this,`readouts`,{massG:0,volumeMl:0,metrics:[]}),q(this,`metrics`,[]),q(this,`character`,void 0),q(this,`onReadouts`,void 0),q(this,`onFirstInteract`,void 0),q(this,`lockstep`,new URLSearchParams(location.search).has(`lockstep`)),q(this,`fps`,0),q(this,`simHz`,0),q(this,`rafFps`,0),q(this,`frames`,0),q(this,`fpsT`,0),q(this,`frameMs`,0),q(this,`pres0`,0),q(this,`sim0`,0),q(this,`W`,1),q(this,`H`,1),q(this,`dpr`,1),q(this,`volRatio`,1),q(this,`tetRestVol`,0),q(this,`twistDecay`,0),q(this,`wheelTimer`,0),q(this,`raf`,0),q(this,`band`,[-1,1]),q(this,`rest`,null),q(this,`loop`,e=>{if(!this.running)return;this.raf=requestAnimationFrame(this.loop);let t=performance.now();if(this.lockstep&&this.path.busy())return;let n=Math.min(Math.max((e-this.last)/1e3,1/240),.25),r=this.lockstep?1/60:Math.min(n,1/30);if(this.last=e,this.colourMix<1&&(this.colourMix=Math.min(1,this.colourMix+(this.lockstep?r:n)*1.6)),this.time+=r,this.frames++,e-this.fpsT>500){let t=1e3/(e-this.fpsT);this.rafFps=this.frames*t,this.fps=(this.path.presented-this.pres0)*t,this.simHz=(this.path.simSteps-this.sim0)*t,this.frames=0,this.fpsT=e,this.pres0=this.path.presented,this.sim0=this.path.simSteps}this.update(r),this.frameMs=this.frameMs*.9+(performance.now()-t)*.1}),q(this,`roT`,0),q(this,`pointers`,new Map),q(this,`mode`,`none`),q(this,`grabPlane`,{p:[0,0,0],n:[0,0,1]}),q(this,`twistStart`,0),q(this,`twistBase`,0),q(this,`pinchStart`,0),q(this,`zoomStart`,1),q(this,`orbitStart`,{x:0,y:0,yaw:0,pitch:0}),q(this,`interacted`,!1),this.canvas=e,this.path=t,this.dprCap=r,this.zeroToOne=i,this.mobilePortrait=a,this.setCharacter(t,n),this.bindInput()}setCharacter(e,t,n){this.path=e,this.character=t,this.actuation=t.actuation,this.metrics=t.metrics,this.act=new Float32Array(t.actuation.channels),this.colour=this.prevColour=n??t.colourways[0],this.colourMix=1;let r=e.asset;this.tetRestVol=r.restVol.reduce((e,t)=>e+t,0),this.volRatio=r.meta.surfVolume/r.meta.tetVolume,this.righting=null,this.rest=null,this.beads.clear(),this.grab.active=!1,this.grab.twist=0,this.autoGrab=!1,this.idleT=0,this.idle=t.idle??null,this.simTime=0,this.mode=`none`,this.pointers.clear();let i=t.camera,a=this.mobilePortrait?i.mobileYaw??i.yaw:i.yaw,o=this.mobilePortrait?i.mobilePitch??i.pitch:i.pitch;this.cam.target=[...i.target],this.cam.yaw=this.camGoal.yaw=a,this.cam.pitch=this.camGoal.pitch=o,this.cam.zoom=this.camGoal.zoom=1,this.readouts={massG:0,volumeMl:0,metrics:t.metrics.map(()=>0)},this.W>2&&(this.W=0,this.resize())}setColour(e){this.prevColour=this.colourNow(),this.colour=e,this.colourMix=0}colourNow(){if(this.colourMix>=1)return this.colour;let e=this.colourMix*this.colourMix*(3-2*this.colourMix),t=(t,n)=>t.map((t,r)=>t+(n[r]-t)*e),n=this.prevColour,r=this.colour;return{...r,absorb:t(n.absorb,r.absorb),back:t(n.back,r.back),finTip:t(n.finTip,r.finTip),belly:t(n.belly,r.belly),glow:t(n.glow,r.glow),bead:t(n.bead,r.bead),bgTop:t(n.bgTop,r.bgTop),bgBot:t(n.bgBot,r.bgBot),floor:t(n.floor,r.floor)}}start(){this.running||(this.running=!0,this.last=performance.now(),cancelAnimationFrame(this.raf),this.raf=requestAnimationFrame(this.loop))}stop(){this.running=!1,cancelAnimationFrame(this.raf)}resize(){let e=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,this.dprCap),this.W=Math.max(2,Math.round(e.width*this.dpr)),this.H=Math.max(2,Math.round(e.height*this.dpr)),this.path.resize(this.W,this.H);let t=e.height||1,n=0,r=t;for(let r of document.querySelectorAll(`.masthead, .characters`)){let i=r.getBoundingClientRect();i.height&&i.bottom<t*.5&&(n=Math.max(n,i.bottom-e.top))}for(let n of document.querySelectorAll(`.readouts, .controls`)){let i=n.getBoundingClientRect();i.height&&i.top>t*.5&&(r=Math.min(r,i.top-e.top))}if(this.band=[1-2*(r-4)/t,1-2*(n+4)/t],!this.rest){let e=this.path.asset.nodes,t=[1e9,1e9,1e9],n=[-1e9,-1e9,-1e9];for(let r=0;r<e.length;r+=3)for(let i=0;i<3;i++)t[i]=Math.min(t[i],e[r+i]),n[i]=Math.max(n[i],e[r+i]);this.rest={lo:t,hi:n}}}dropBait(){let e=.016+Math.random()*.008,t=Math.random(),n,r;t<.65?(n=.58+Math.random()*.14,r=(Math.random()-.5)*.36):(n=-.2+Math.random()*.5,r=(Math.random()-.5)*.12),this.beads.spawn(n,.42+Math.random()*.1,r,e)}reset(){this.autoGrab=!1,this.idleT=0,this.path.reset(),this.beads.clear(),this.grab.active=!1,this.simTime=0}update(e){this.simTime+=Math.min(e,1/60),this.actuation.activation(this.simTime,this.act),this.wheelTimer>0&&(this.wheelTimer-=e,this.wheelTimer<=0&&this.pointers.size===0&&(this.grab.active=!1,this.grab.twist=0));let t=this.path.nodes();this.beads.step(e,t?.data??null,t?.stride??4,this.path.asset.nodes.length/3,this.path.asset.meta.h*.42,pt.gravity),this.updateIdle(Math.min(e,1/60)),t&&(this.righting||(this.righting=new yt(this.path.asset.nodes)),this.tilt=this.righting.update(t.data,t.stride,Math.min(e,1/60),this.grab.active,this.spin)),this.path.step({dt:Math.min(e,1/60),act:this.act,grab:this.grab,beads:this.beads.pos,beadCount:this.beads.count,spin:this.spin}),this.updateCamera(e),this.writeFrame(),this.path.render(this.frame,1,this.time),this.updateReadouts(e)}updateCamera(e){let t=1-Math.exp(-e*8),n=this.cam,r=this.camGoal;n.yaw+=(r.yaw-n.yaw)*t,n.pitch+=(r.pitch-n.pitch)*t,n.zoom+=(r.zoom-n.zoom)*t;let i=this.W/this.H,a=i<.85;n.fov=a?.62:.48;let o=Math.tan(n.fov/2),s=o*i,c=.6*Math.abs(Math.cos(n.yaw))+.24*Math.abs(Math.sin(n.yaw)),l=Math.max(c/s,.24/o)*1.32+.2,u=[n.target[0],n.target[1]+(a?.02:0),n.target[2]],d=0,f=!this.character.camera.legacyFit;if((a||f)&&this.rest){let[e,t]=a?this.band:[-.66,.6];d=(e+t)/2;let r=Math.max(.2,(t-e)/2),i=[Math.sin(n.yaw)*Math.cos(n.pitch),Math.sin(n.pitch),Math.cos(n.yaw)*Math.cos(n.pitch)],c=[i[2],0,-i[0]],f=Math.hypot(c[0],c[2]);c[0]/=f,c[2]/=f;let p=[i[1]*c[2]-i[2]*c[1],i[2]*c[0]-i[0]*c[2],i[0]*c[1]-i[1]*c[0]],{lo:m,hi:h}=this.rest,g=a?.86:.9;l=0;for(let e=0;e<8;e++){let t=[(e&1?h[0]:m[0])-u[0],(e&2?h[1]:m[1])-u[1],(e&4?h[2]:m[2])-u[2]],n=t[0]*c[0]+t[2]*c[2],a=t[0]*p[0]+t[1]*p[1]+t[2]*p[2],d=t[0]*i[0]+t[1]*i[1]+t[2]*i[2];l=Math.max(l,d+Math.abs(n)/(s*g),d+Math.abs(a)/(o*r*g))}}!a&&this.H/this.dpr<520&&(l*=1.3,d=.1),l*=n.zoom,n.eye=[u[0]+l*Math.sin(n.yaw)*Math.cos(n.pitch),u[1]+l*Math.sin(n.pitch),u[2]+l*Math.cos(n.yaw)*Math.cos(n.pitch)],G.lookAt(this.view,n.eye,u,[0,1,0]),G.perspective(this.proj,n.fov,i,.05,40,this.zeroToOne),this.proj[9]=-d,G.mul(this.vp,this.proj,this.view),G.invert(this.ivp,this.vp);let p=bt,m=Math.hypot(p[0],p[1],p[2]),h=p.map(e=>e/m),g=G.create(),_=G.create();G.lookAt(g,[h[0]*3,h[1]*3,h[2]*3],[0,0,0],[1,0,0]),G.ortho(_,-.85,.85,-.85,.85,.5,6,this.zeroToOne),G.mul(this.lvp,_,g)}writeFrame(){let e=this.frame,t=this.path.asset,n=this.colourNow();e.set(this.vp,K.viewProj),e.set(this.view,K.view),e.set(this.proj,K.proj),e.set(this.ivp,K.invViewProj),e.set(this.lvp,K.lightVP),e.set([this.cam.eye[0],this.cam.eye[1],this.cam.eye[2],this.time],K.camPos),e.set([this.W,this.H,1/this.W,1/this.H],K.res),e.set([t.meta.qmin[0],t.meta.qmin[1],t.meta.qmin[2],t.meta.unitCm],K.qmin),e.set([t.meta.qext[0],t.meta.qext[1],t.meta.qext[2],0],K.qext),e.set([n.absorb[0],n.absorb[1],n.absorb[2],n.ior??1.36],K.absorb),e.set([n.ink?.[0]??13,n.ink?.[1]??.32,0,0],K.extra),e.set(n.back,K.backCol),e.set(n.finTip,K.finTipCol),e.set(n.belly,K.bellyCol),e.set(n.glow,K.glowCol),e.set([n.floor[0],n.floor[1],n.floor[2],1],K.studio),e.set([this.beads.count,this.grab.twist,.05,40],K.misc),e.set(n.bead,K.beadCol),e.set(this.beads.pos.subarray(0,64),K.beads);let r=bt,i=Math.hypot(r[0],r[1],r[2]);e.set([r[0]/i,r[1]/i,r[2]/i,0],K.lightDir),e.set([n.bgTop[0],n.bgTop[1],n.bgTop[2],1],K.bgTop),e.set([n.bgBot[0],n.bgBot[1],n.bgBot[2],1],K.bgBot)}landmark(e,t,n){let r=this.path.asset,i=r.meta.landmarks.indexOf(e),a=0,o=0,s=0;for(let e=0;e<4;e++){let c=r.s.lmN[4*i+e],l=r.s.lmW[4*i+e];a+=t[c*n]*l,o+=t[c*n+1]*l,s+=t[c*n+2]*l}return[a,o,s]}updateReadouts(e){if(this.roT+=e,this.roT<.1)return;this.roT=0;let t=this.path.nodes();if(!t)return;let n=this.path.asset,{data:r,stride:i}=t,a=n.tets,o=0;for(let e=0;e<a.length;e+=4){let t=a[e]*i,n=a[e+1]*i,s=a[e+2]*i,c=a[e+3]*i,l=r[n]-r[t],u=r[n+1]-r[t+1],d=r[n+2]-r[t+2],f=r[s]-r[t],p=r[s+1]-r[t+1],m=r[s+2]-r[t+2],h=r[c]-r[t],g=r[c+1]-r[t+1],_=r[c+2]-r[t+2];o+=(l*(p*_-m*g)-u*(f*_-m*h)+d*(f*g-p*h))/6}let s=n.meta.unitCm,c=o*this.volRatio*s*s*s;this.readouts={volumeMl:c,massG:c*1.04,metrics:this.metrics.map(e=>{let t=this.landmark(e.a,r,i),n=this.landmark(e.b,r,i);return Math.hypot(t[0]-n[0],t[1]-n[1],t[2]-n[2])*s})},this.onReadouts?.(this.readouts)}ray(e,t){let n=this.canvas.getBoundingClientRect(),r=(e-n.left)/n.width*2-1,i=-((t-n.top)/n.height*2-1),a=this.zeroToOne?0:-1,o=G.transformPoint(this.ivp,r,i,a),s=G.transformPoint(this.ivp,r,i,1),c=[o[0]/o[3],o[1]/o[3],o[2]/o[3]],l=[s[0]/s[3],s[1]/s[3],s[2]/s[3]],u=[l[0]-c[0],l[1]-c[1],l[2]-c[2]],d=Math.hypot(u[0],u[1],u[2]);return{ro:c,rd:[u[0]/d,u[1]/d,u[2]/d]}}pick(e,t){let n=this.path.nodes();if(!n)return null;let{ro:r,rd:i}=this.ray(e,t),{data:a,stride:o}=n,s=this.path.asset.nodes.length/3,c=this.path.asset.meta.h*.9+.006,l=-1,u=1e9;for(let e=0;e<s;e++){let t=e*o,n=a[t]-r[0],s=a[t+1]-r[1],d=a[t+2]-r[2],f=n*i[0]+s*i[1]+d*i[2];if(f<=0)continue;let p=n-i[0]*f,m=s-i[1]*f,h=d-i[2]*f,g=Math.hypot(p,m,h);g<c&&f-(c-g)<u&&(u=f-(c-g)*.5,l=e)}if(l<0)return null;let d=l*o;return{node:l,p:[a[d],a[d+1],a[d+2]]}}updateIdle(e){let t=this.idle;if(!t)return;if(this.pointers.size>0||this.wheelTimer>0||this.grab.active&&!this.autoGrab){this.autoGrab=!1,this.idleT=0;return}this.idleT+=e;let n=(this.idleT+(t.offset??0))%t.period;if(n<t.duration){let e=n/t.duration,r=Math.sin(Math.PI*Math.min(1,e*1.25))**2;if(!this.autoGrab){let e=this.path.nodes();if(!e)return;let n=this.path.asset.nodes,r=0,i=1e9;for(let e=0;e<n.length/3;e++){let a=(n[3*e]-t.at[0])**2+(n[3*e+1]-t.at[1])**2+(n[3*e+2]-t.at[2])**2;a<i&&(i=a,r=e)}let a=r*e.stride,o=[e.data[a],e.data[a+1],e.data[a+2]];this.startGrab(r,o,t.radius),this.autoP0=o,this.autoGrab=!0}for(let e=0;e<3;e++)this.grab.target[e]=this.autoP0[e]+t.lift[e]*r}else this.autoGrab&&(this.autoGrab=!1,this.grab.active=!1)}startGrab(e,t,n){let{data:r,stride:i}=this.path.nodes(),a=this.path.asset.nodes.length/3,o=[];for(let e=0;e<a;e++){let a=e*i,s=Math.hypot(r[a]-t[0],r[a+1]-t[1],r[a+2]-t[2]);s<n&&o.push([s,e])}o.sort((e,t)=>e[0]-t[0]);let s=this.grab;s.count=Math.min(o.length,64);for(let e=0;e<s.count;e++){let[a,c]=o[e],l=c*i;s.idx[e]=c,s.wt[e]=(1-a/n)**1.5,s.off[3*e]=r[l]-t[0],s.off[3*e+1]=r[l+1]-t[1],s.off[3*e+2]=r[l+2]-t[2]}s.target.set(t),s.twist=0;let c=[this.cam.eye[0]-t[0],this.cam.eye[1]-t[1],this.cam.eye[2]-t[2]],l=Math.hypot(c[0],c[1],c[2]);this.grabPlane={p:[...t],n:[c[0]/l,c[1]/l,c[2]/l]},s.axis.set(this.grabPlane.n),s.active=!0}moveGrab(e,t){let{ro:n,rd:r}=this.ray(e,t),{p:i,n:a}=this.grabPlane,o=r[0]*a[0]+r[1]*a[1]+r[2]*a[2];if(Math.abs(o)<1e-5)return;let s=((i[0]-n[0])*a[0]+(i[1]-n[1])*a[1]+(i[2]-n[2])*a[2])/o,c=n[0]+r[0]*s,l=n[1]+r[1]*s,u=n[2]+r[2]*s,d=c-i[0],f=l-i[1],p=u-i[2],m=Math.hypot(d,f,p),h=.32;if(m>h){let e=h/m;c=i[0]+d*e,l=i[1]+f*e,u=i[2]+p*e}this.grab.target.set([c,Math.max(l,.005),u])}firstInteract(){this.interacted||(this.interacted=!0,this.onFirstInteract?.())}bindInput(){let e=this.canvas;e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`pointerdown`,t=>{if(e.setPointerCapture(t.pointerId),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.firstInteract(),this.pointers.size===1){let e=this.pick(t.clientX,t.clientY);e?(this.mode=`grab`,this.startGrab(e.node,e.p,.075)):(this.mode=`orbit`,this.orbitStart={x:t.clientX,y:t.clientY,yaw:this.camGoal.yaw,pitch:this.camGoal.pitch})}else if(this.pointers.size===2){let[e,t]=[...this.pointers.values()];this.mode===`grab`?(this.mode=`twist`,this.twistStart=Math.atan2(t.y-e.y,t.x-e.x),this.twistBase=this.grab.twist):(this.mode=`pinch`,this.pinchStart=Math.hypot(t.x-e.x,t.y-e.y),this.zoomStart=this.camGoal.zoom,this.twistStart=Math.atan2(t.y-e.y,t.x-e.x),this.orbitStart.yaw=this.camGoal.yaw)}}),e.addEventListener(`pointermove`,e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});let t=[...this.pointers.values()];if(this.mode===`grab`)this.moveGrab(e.clientX,e.clientY);else if(this.mode===`orbit`){let t=this.orbitStart;this.camGoal.yaw=t.yaw-(e.clientX-t.x)*.006,this.camGoal.pitch=Math.min(1.25,Math.max(.08,t.pitch+(e.clientY-t.y)*.004))}else if(this.mode===`twist`&&t.length>=2){let e=Math.atan2(t[1].y-t[0].y,t[1].x-t[0].x)-this.twistStart;for(;e>Math.PI;)e-=2*Math.PI;for(;e<-Math.PI;)e+=2*Math.PI;this.grab.twist=Math.max(-2.2,Math.min(2.2,this.twistBase-e)),this.moveGrab(t[0].x,t[0].y)}else if(this.mode===`pinch`&&t.length>=2){let e=Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y);this.camGoal.zoom=Math.min(1.6,Math.max(.45,this.zoomStart*this.pinchStart/Math.max(e,1)))}});let t=e=>{this.pointers.delete(e.pointerId),this.pointers.size===0?(this.mode=`none`,this.grab.active=!1,this.grab.twist=0):this.mode===`twist`?this.mode=`grab`:this.mode===`pinch`&&(this.mode=`none`)};e.addEventListener(`pointerup`,t),e.addEventListener(`pointercancel`,t),e.addEventListener(`wheel`,e=>{e.preventDefault(),this.firstInteract();let t=e.deltaMode===1?e.deltaY*16:e.deltaY;if(this.mode===`grab`||this.mode===`twist`)this.grab.twist=Math.max(-2.2,Math.min(2.2,this.grab.twist+t*.004));else{if(!this.grab.active){let n=this.pick(e.clientX,e.clientY);if(!n){this.camGoal.zoom=Math.min(1.6,Math.max(.45,this.camGoal.zoom*Math.exp(t*.001)));return}this.startGrab(n.node,n.p,.11)}this.grab.twist=Math.max(-2.2,Math.min(2.2,this.grab.twist+t*.004)),this.wheelTimer=.7}},{passive:!1})}async debugFreeze(e){e?(await this.debugCapture(),this.stop(),await this.path.idle?.()):(await this.debugCapture(!1),this.start())}async debugCapture(e=!0){document.getElementById(`gpushot`)?.remove();let t=this.path;if(!e||!t.capture)return!1;let n=await t.capture(),r=document.createElement(`canvas`);r.id=`gpushot`,r.width=n.width,r.height=n.height,r.getContext(`2d`).putImageData(n,0,0);let i=getComputedStyle(this.canvas),a=this.canvas.getBoundingClientRect();return r.style.cssText=`position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;z-index:${i.zIndex};pointer-events:none`,this.canvas.after(r),!0}},J=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
${dt}
`,Y=`
float sat(float x){ return clamp(x, 0.0, 1.0); }
float rectMask(vec2 p, vec2 h, float s){ vec2 q = 1.0 - smoothstep(h - s, h + s, abs(p)); return q.x * q.y; }
// Studio environment: dim walls + large overhead softbox + two strip lights + rim.
vec3 envStudio(vec3 d){
  float up = d.y;
  vec3 c = mix(vec3(0.035, 0.035, 0.038), vec3(0.16, 0.16, 0.158), smoothstep(-0.3, 0.9, up)) + vec3(0.22) * smoothstep(0.1, -0.25, up);
  if (d.y > 0.02) { vec2 p = d.xz * (2.2 / d.y) - vec2(0.25, 0.55); c += vec3(6.0, 5.9, 5.7) * rectMask(p, vec2(1.1, 0.75), 0.35); }
  if (d.z > 0.05) { vec2 p = vec2(d.x, d.y) * (2.4 / d.z) - vec2(-1.3, 0.9); c += vec3(2.6) * rectMask(p, vec2(0.22, 0.9), 0.12); }
  if (d.x > 0.05) { vec2 p = vec2(d.z, d.y) * (2.6 / d.x) - vec2(1.2, 0.8); c += vec3(2.0, 2.0, 2.05) * rectMask(p, vec2(0.25, 0.7), 0.15); }
  if (d.z < -0.05) { vec2 p = vec2(d.x, d.y) * (2.5 / -d.z) - vec2(-0.2, 1.4); c += vec3(3.2, 3.1, 3.0) * rectMask(p, vec2(1.4, 0.5), 0.4); }
  return c;
}
vec3 lightKey(){ return normalize(fr.lightDir.xyz); }
vec3 lightRim(){ return normalize(vec3(-0.15, 0.55, -1.0)); }
float linDepth(vec3 P){ return -(fr.view * vec4(P, 1.0)).z; }
`,St=J+`
uniform highp sampler2D uNodes; uniform highp sampler2D uRest;
ivec2 tcoord(int t){ return ivec2(t & 1023, t >> 10); }
void skinOne(int n, float w, vec3 X, inout vec3 P, inout mat3 Fs){
  vec3 x = texelFetch(uNodes, tcoord(n * 4), 0).xyz;
  mat3 F = mat3(texelFetch(uNodes, tcoord(n * 4 + 1), 0).xyz, texelFetch(uNodes, tcoord(n * 4 + 2), 0).xyz, texelFetch(uNodes, tcoord(n * 4 + 3), 0).xyz);
  vec3 Xk = texelFetch(uRest, tcoord(n), 0).xyz;
  P += w * (x + F * (X - Xk)); Fs += w * F;
}
void skin(vec3 X, vec3 Nr, uvec4 nd, vec4 w, out vec3 P, out vec3 Nw){
  P = vec3(0.0); mat3 Fs = mat3(0.0);
  skinOne(int(nd.x), w.x, X, P, Fs); skinOne(int(nd.y), w.y, X, P, Fs);
  skinOne(int(nd.z), w.z, X, P, Fs); skinOne(int(nd.w), w.w, X, P, Fs);
  mat3 C = mat3(cross(Fs[1], Fs[2]), cross(Fs[2], Fs[0]), cross(Fs[0], Fs[1]));
  Nw = normalize(C * Nr);
}
layout(location=0) in vec4 aPos; layout(location=1) in vec4 aNrm; layout(location=2) in vec4 aAttr;
layout(location=3) in uvec4 aNodes; layout(location=4) in vec4 aW;

uniform int uLight; // 1 = render from light
out vec3 vP; out vec3 vN; out vec3 vX; out vec3 vNr; out vec4 vA;
void main(){
  vec3 X = fr.qmin.xyz + aPos.xyz * fr.qext.xyz;
  vec3 Nr = normalize(aNrm.xyz);
  vec4 w = max(aW * 2.0, vec4(0.0)); w /= max(dot(w, vec4(1.0)), 1e-4);
  vec3 P, N; skin(X, Nr, aNodes, w, P, N);
  vP = P; vN = N; vX = X; vNr = Nr; vA = aAttr;
  gl_Position = (uLight == 1 ? fr.lightVP : fr.viewProj) * vec4(P, 1.0);
}`,Ct=J+Y+`
uniform int uLayer;
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){
  float d = -dot(vP, lightKey());
  float s = gl_FrontFacing ? -d : d;
  o = uLayer == 0 ? vec4(s, 0.0, 0.0, vP.y) : vec4(0.0, s, 0.0, vP.y);
}`,wt=J+Y+`
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){ o = vec4(linDepth(vP), 0.0, 0.0, 1.0); }`,Tt=`#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`,Et=`
uniform sampler2D uShadow;
vec3 floorShadow(vec3 P, out float ao){
  vec4 lp = fr.lightVP * vec4(P, 1.0); vec2 uv = lp.xy * 0.5 + 0.5;
  vec4 c0 = texture(uShadow, uv);
  float hgt = clamp(P.y - (c0.a > 5.0 ? 0.0 : c0.a), 0.0, 0.4);
  vec2 acc = vec2(0.0); float wsum = 0.0; vec2 aoAcc = vec2(0.0);
  float rad = 0.006 + 0.07 * clamp(c0.a < 5.0 ? c0.a : 0.12, 0.0, 0.3);
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.39996 + 0.3; float r = sqrt((float(i) + 0.5) / 16.0);
    vec2 o2 = vec2(cos(a), sin(a)) * r;
    vec4 s = texture(uShadow, uv + o2 * rad / 1.6);
    acc += max(s.rg, 0.0); wsum += 1.0;
    vec4 s2 = texture(uShadow, uv + o2 * 0.10 / 1.6);
    aoAcc += max(s2.rg, 0.0);
  }
  acc /= wsum; aoAcc /= 16.0;
  ao = 1.0 - 0.45 * sat((aoAcc.x * 0.6 + aoAcc.y * 2.0) * 6.0);
  vec3 T = exp(-fr.absorb.rgb * acc.x * 1.25) * exp(-vec3(26.0) * acc.y);
  return T;
}
vec3 beadShadow(vec3 P){
  vec3 s = vec3(1.0);
  for (int i = 0; i < 16; i++) {
    if (float(i) >= fr.misc.x) break;
    vec4 b = fr.beads[i];
    vec3 d = b.xyz - P; float dl = length(d);
    float occ = b.w * b.w / (dl * dl);
    float k = sat(dot(normalize(d), lightKey()) * 0.5 + 0.5);
    s *= 1.0 - 0.55 * occ * k * k * (1.0 - fr.beadCol.a * 0.0);
  }
  return mix(vec3(1.0), s, 0.9) * mix(vec3(1.0), fr.beadCol.rgb, (1.0 - s.r) * 0.35);
}`,Dt=J+Y+Et+`
in vec2 vUv; out vec4 o;
void main(){
  vec4 a = fr.invViewProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0); vec4 b = fr.invViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 ro = a.xyz / a.w; vec3 rd = normalize(b.xyz / b.w - ro);
  vec3 bg = mix(fr.bgBot.rgb, fr.bgTop.rgb, smoothstep(-0.05, 0.6, rd.y)) ;
  float depth = 1000.0;
  vec3 col = bg;
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y; vec3 P = ro + rd * t;
    float r = length(P.xz - vec2(-0.02, 0.02));
    float pool = exp(-r * r / 0.85);
    float ao; vec3 T = floorShadow(P, ao);
    vec3 bs = beadShadow(P);
    vec3 key = vec3(0.70) * T * bs; vec3 amb = vec3(0.42) * ao;
    // jelly caustic: a little focused light inside the tinted shadow
    vec3 caustic = (1.0 - T) * T * fr.glowCol.rgb * 0.55;
    vec3 floorC = fr.studio.rgb * (amb * 0.8 + key * (0.42 + 0.30 * pool) + caustic) * (0.80 + 0.16 * pool);
    float fade = smoothstep(2.5, 7.0, t);
    col = mix(floorC, bg, fade);
    depth = linDepth(P);
  }
  o = vec4(col, depth);
}`,Ot=(e,t)=>J+Y+Et+e+t+`
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(fr.camPos.xyz - vP);
  vec4 pat = innerPattern(vX, normalize(vNr));
  // light reaching the milky layer has crossed clear jelly: tint it
  vec4 lp = fr.lightVP * vec4(vP, 1.0); vec4 sh = texture(uShadow, lp.xy * 0.5 + 0.5);
  vec3 T = exp(-fr.absorb.rgb * max(sh.r, 0.0) * 0.45);
  vec3 L = lightKey();
  float wrap = sat((dot(N, L) + 0.7) / 1.7);
  float rim = pow(1.0 - sat(dot(N, V)), 2.0);
  vec3 sss = fr.bellyCol.rgb * (0.38 + 0.75 * wrap * T) + fr.glowCol.rgb * rim * 0.12;
  vec3 col = sss * pat.rgb;
  // eye: glossy black lens
  if (pat.a > 0.0) {
    vec3 R = reflect(-V, N);
    float f = 0.04 + 0.96 * pow(1.0 - sat(dot(N, V)), 5.0);
    vec3 eyeC = vec3(0.012, 0.011, 0.012) + envStudio(R) * (0.06 + f * 0.6);
    col = mix(col, eyeC, pat.a);
  }
  o = vec4(col, linDepth(vP));
}`,kt=J+`
uniform highp sampler2D uNodes;
ivec2 tcoord(int t){ return ivec2(t & 1023, t >> 10); }
layout(location=0) in vec4 iBub; layout(location=1) in uvec4 iN; layout(location=2) in vec4 iW;
out vec2 vQ; out vec3 vC; out float vR;
vec3 nodeP(uint n){ return texelFetch(uNodes, tcoord(int(n) * 4), 0).xyz; }
void main(){
  vec2 q = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vec3 C = nodeP(iN.x) * iW.x + nodeP(iN.y) * iW.y + nodeP(iN.z) * iW.z + nodeP(iN.w) * iW.w;
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 P = C + (right * q.x + up * q.y) * iBub.w;
  vQ = q; vC = C; vR = iBub.w;
  gl_Position = fr.viewProj * vec4(P, 1.0);
}`,At=J+Y+`
in vec2 vQ; in vec3 vC; in float vR; out vec4 o;
void main(){
  float r2 = dot(vQ, vQ); if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  float rim = pow(1.0 - z, 2.2);
  float spec = pow(sat(1.0 - length(vQ - vec2(-0.38, 0.42)) * 2.6), 3.0);
  float a = sat(rim * 0.95 + spec + 0.06);
  vec3 c = vec3(1.0) * (rim * 1.2 + spec * 2.5) + fr.glowCol.rgb * 0.05;
  o = vec4(c * a, a);
}`,jt=J+`
out vec2 vQ; flat out int vI;
void main(){
  int i = gl_VertexID / 6; int k = gl_VertexID % 6;
  int kk = k < 3 ? k : k - 2; if (k == 3) kk = 2; if (k == 4) kk = 1; if (k == 5) kk = 3;
  vec2 q = vec2(float(kk & 1), float((kk >> 1) & 1)) * 2.0 - 1.0;
  vec4 b = fr.beads[i];
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 P = b.xyz + (right * q.x + up * q.y) * b.w * 1.05;
  vQ = q * 1.05; vI = i;
  gl_Position = float(i) < fr.misc.x ? fr.viewProj * vec4(P, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`,Mt=J+Y+`
in vec2 vQ; flat in int vI; out vec4 o;
void main(){
  vec4 b = fr.beads[vI];
  vec3 right = vec3(fr.view[0][0], fr.view[1][0], fr.view[2][0]); vec3 up = vec3(fr.view[0][1], fr.view[1][1], fr.view[2][1]);
  vec3 fwd = normalize(b.xyz - fr.camPos.xyz);
  float r2 = dot(vQ, vQ); if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  vec3 N = normalize(right * vQ.x + up * vQ.y - fwd * z);
  vec3 P = b.xyz + N * b.w;
  vec3 V = normalize(fr.camPos.xyz - P);
  float f = 0.03 + 0.97 * pow(1.0 - sat(dot(N, V)), 5.0);
  vec3 R = reflect(-V, N);
  float thick = z;
  vec3 body = fr.beadCol.rgb * fr.beadCol.rgb * (0.25 + 0.9 * exp(-2.2 * thick)) ;
  vec3 L = lightKey();
  vec3 glow = fr.beadCol.rgb * pow(sat(dot(-N, L) * 0.5 + 0.5), 2.0) * 0.6;
  vec3 col = body + glow * (1.0 - z) + envStudio(R) * f * 0.9;
  vec4 cp = fr.viewProj * vec4(P, 1.0);
  gl_FragDepth = (cp.z / cp.w) * 0.5 + 0.5;
  o = vec4(col, linDepth(P));
}`,Nt=e=>J+Y+e+`
uniform sampler2D uScene; uniform sampler2D uBack;
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
vec2 toUv(vec3 P){ vec4 c = fr.viewProj * vec4(P, 1.0); return c.xy / c.w * 0.5 + 0.5; }
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(fr.camPos.xyz - vP);
  if (!gl_FrontFacing) N = -N;
  vec2 uv = gl_FragCoord.xy * fr.res.zw;
  float zf = linDepth(vP);
  vec4 sc = texture(uScene, uv);
  if (sc.a < zf - 0.004) discard;                       // something (a bead) is in front
  float zb = texture(uBack, uv).r; if (zb < zf) zb = zf + 0.004; if (zb > 100.0) zb = zf + 0.004;
  vec4 pat = shellPattern(vX, normalize(vNr), vA);
  float back = pat.x * fr.backCol.a; float slit = pat.y; float tip = pat.z * fr.finTipCol.a; float groove = pat.w;
  // refraction through the jelly (chromatic)
  float ior = fr.absorb.a;
  float thick0 = clamp(min(zb, sc.a) - zf, 0.0, 0.5);
  vec3 col = vec3(0.0); vec3 Tsum = vec3(0.0);
  vec3 sig = fr.absorb.rgb * (1.0 + back * 0.9 + tip * 2.5) + vec3(slit * fr.extra.x + groove * 6.0);
  for (int c = 0; c < 3; c++) {
    float e = ior + (float(c) - 1.0) * 0.018;
    vec3 rd = refract(-V, N, 1.0 / e);
    float travel = thick0 * 0.85 + 0.01;
    vec2 ruv = toUv(vP + rd * travel);
    ruv = mix(uv, ruv, 0.9);
    vec4 s = texture(uScene, ruv);
    float zb2 = texture(uBack, ruv).r;
    float th = clamp(min(max(zb2, zf), s.a) - zf, 0.0, 0.5);
    th = zb2 > 100.0 ? thick0 : mix(thick0, th, 0.6);
    vec3 T = exp(-sig * th);
    if (c == 0) { col.r = s.r * T.r; Tsum.r = T.r; }
    if (c == 1) { col.g = s.g * T.g; Tsum.g = T.g; }
    if (c == 2) { col.b = s.b * T.b; Tsum.b = T.b; }
  }
  // surface pigment: darker back, dusky fin tips, slits
  vec3 filt = mix(vec3(1.0), fr.backCol.rgb, back) * mix(vec3(1.0), fr.finTipCol.rgb, tip);
  filt *= 1.0 - fr.extra.y * slit;
  col *= filt;
  // back-lit glow in the thin parts
  float thin = exp(-thick0 / 0.035);
  vec3 L = lightKey(); vec3 Lr = lightRim();
  float through = pow(sat(dot(-N, Lr) * 0.6 + 0.4), 1.5) * 1.1 + pow(sat(dot(-V, L) * 0.5 + 0.5), 2.0) * 0.4;
  // dark things right behind a thin skin (eyes, nostrils) stay dark: scale the scattered glow by what lies behind
  float behind = mix(0.12, 1.0, smoothstep(0.02, 0.3, dot(sc.rgb, vec3(0.3, 0.6, 0.1))));
  vec3 glow = fr.glowCol.rgb * filt * thin * through * (1.0 - Tsum * 0.5) * 0.85 * behind;
  // subsurface-ish body colour in thick parts (scattered key light)
  vec3 scatter = fr.glowCol.rgb * filt * (1.0 - Tsum) * 0.10 * (0.5 + 0.5 * sat(dot(N, L)));
  // reflections
  vec3 R = reflect(-V, N);
  float ndv = sat(dot(N, V));
  float F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
  vec3 refl = envStudio(R) * (1.0 - slit * 0.7 - groove * 0.4);
  // tight key specular to make the jelly wet
  vec3 H = normalize(L + V);
  float sp = pow(sat(dot(N, H)), 420.0) * 3.0;
  col = col * (1.0 - F) + refl * F + glow + scatter + vec3(sp) * (1.0 - slit);
  o = vec4(col, 1.0);
}`,Pt=`#version 300 es
precision highp float;
uniform sampler2D uScene; uniform sampler2D uShell; uniform vec4 uParams; // exposure, time, grain, vignette
in vec2 vUv; out vec4 o;
vec3 neutral(vec3 color){
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset; float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression; float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak; float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, newPeak * vec3(1.0), g);
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec4 s = texture(uScene, vUv); vec4 j = texture(uShell, vUv);
  vec3 c = j.rgb + s.rgb * (1.0 - j.a);
  c *= uParams.x;
  vec2 q = vUv - 0.5; c *= 1.0 - uParams.w * dot(q, q) * 1.2;
  c = neutral(c);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (h12(gl_FragCoord.xy + fract(uParams.y) * 100.0) - 0.5) * uParams.z;
  o = vec4(c, 1.0);
}`;function X(e,t,n,r){let i=(t,n)=>{let i=e.createShader(t);if(e.shaderSource(i,n),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){let a=e.getShaderInfoLog(i),o=n.split(`
`).map((e,t)=>`${t+1}: ${e}`).join(`
`);throw console.warn(o),Error(`${r} ${t===e.VERTEX_SHADER?`VS`:`FS`}: ${a}`)}return i},a=e.createProgram();if(e.attachShader(a,i(e.VERTEX_SHADER,t)),e.attachShader(a,i(e.FRAGMENT_SHADER,n)),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw Error(r+` link: `+e.getProgramInfoLog(a));let o=e.getUniformBlockIndex(a,`Frame`);return o!==e.INVALID_INDEX&&e.uniformBlockBinding(a,o,0),a}var Ft=class{constructor(e,t,n){q(this,`canvas`,void 0),q(this,`asset`,void 0),q(this,`kind`,`webgl2`),q(this,`gl`,void 0),q(this,`progs`,{}),q(this,`ubo`,void 0),q(this,`nodeTex`,void 0),q(this,`restTex`,void 0),q(this,`nodeRows`,1),q(this,`vaoOuter`,void 0),q(this,`vaoInner`,void 0),q(this,`vaoBub`,void 0),q(this,`vaoEmpty`,void 0),q(this,`nOuter`,0),q(this,`nInner`,0),q(this,`nBub`,0),q(this,`idxType`,0),q(this,`shadow`,void 0),q(this,`scene`,void 0),q(this,`back`,void 0),q(this,`shell`,void 0),q(this,`W`,1),q(this,`H`,1),q(this,`samples`,4),q(this,`halfFloat`,!0),q(this,`look`,void 0),q(this,`bufs`,[]),q(this,`nodeStage`,void 0),this.canvas=e,this.asset=t,this.look=n.look;let r=e.getContext(`webgl2`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,powerPreference:`high-performance`});if(!r)throw Error(`WebGL2 unavailable`);this.gl=r,r.getExtension(`EXT_color_buffer_float`)||r.getExtension(`EXT_color_buffer_half_float`)||(this.halfFloat=!1),r.getExtension(`OES_texture_float_linear`),this.samples=Math.min(n.msaa,r.getParameter(r.MAX_SAMPLES)),this.init()}init(){let e=this.gl,t=this.asset,n=this.progs;n.shadow=X(e,St,Ct,`shadow`),n.back=X(e,St,wt,`back`),n.inner=X(e,St,Ot(this.look.shellGLSL,this.look.innerGLSL),`inner`),n.shell=X(e,St,Nt(this.look.shellGLSL),`shell`),n.backdrop=X(e,Tt,Dt,`backdrop`),n.bubble=X(e,kt,At,`bubble`),n.bead=X(e,jt,Mt,`bead`),n.composite=X(e,Tt,Pt,`composite`),this.ubo=e.createBuffer(),e.bindBuffer(e.UNIFORM_BUFFER,this.ubo),e.bufferData(e.UNIFORM_BUFFER,832,e.DYNAMIC_DRAW),e.bindBufferBase(e.UNIFORM_BUFFER,0,this.ubo);let r=t.nodes.length/3;this.nodeRows=Math.ceil(r*4/1024),this.nodeTex=this.floatTex(1024,this.nodeRows);let i=Math.ceil(r/1024);this.restTex=this.floatTex(1024,i);let a=new Float32Array(1024*i*4);for(let e=0;e<r;e++)a.set([t.nodes[3*e],t.nodes[3*e+1],t.nodes[3*e+2],1],4*e);e.bindTexture(e.TEXTURE_2D,this.restTex),e.texSubImage2D(e.TEXTURE_2D,0,0,0,1024,i,e.RGBA,e.FLOAT,a);let o=t.s,s=t=>{let n=e.createVertexArray();e.bindVertexArray(n);let r=(t,n,r,i,a,o=!1)=>{let s=e.createBuffer();this.bufs.push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),e.enableVertexAttribArray(n),o?e.vertexAttribIPointer(n,r,i,0,0):e.vertexAttribPointer(n,r,i,a,0,0)};r(o[t+`pos`],0,4,e.UNSIGNED_SHORT,!0),r(o[t+`nrm`],1,4,e.SHORT,!0),r(o[t+`attr`],2,4,e.UNSIGNED_BYTE,!0),r(o[t+`nodes`],3,4,e.UNSIGNED_SHORT,!1,!0),r(o[t+`wts`],4,4,e.SHORT,!0);let i=e.createBuffer();return this.bufs.push(i),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,i),e.bufferData(e.ELEMENT_ARRAY_BUFFER,o[t+`idx`],e.STATIC_DRAW),e.bindVertexArray(null),n};this.vaoOuter=s(`o_`),this.nOuter=o.o_idx.length,this.vaoInner=s(`i_`),this.nInner=o.i_idx.length,this.vaoBub=e.createVertexArray(),e.bindVertexArray(this.vaoBub);let c=(t,n,r,i,a)=>{let o=e.createBuffer();this.bufs.push(o),e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),e.enableVertexAttribArray(n),a?e.vertexAttribIPointer(n,r,i,0,0):e.vertexAttribPointer(n,r,i,!1,0,0),e.vertexAttribDivisor(n,1)};c(o.bub,0,4,e.FLOAT,!1),c(o.bubN,1,4,e.UNSIGNED_SHORT,!0),c(o.bubW,2,4,e.FLOAT,!1),this.nBub=o.bub.length/4,e.bindVertexArray(null),this.vaoEmpty=e.createVertexArray(),this.shadow=this.makeTarget(512,512,0,!1),this.uploadNodes(this.restNodeData())}restNodeData(){let e=this.asset,t=e.nodes.length/3,n=new Float32Array(t*16);for(let r=0;r<t;r++)n.set([e.nodes[3*r],e.nodes[3*r+1],e.nodes[3*r+2],1,1,0,0,0,0,1,0,0,0,0,1,0],16*r);return n}floatTex(e,t){let n=this.gl,r=n.createTexture();return n.bindTexture(n.TEXTURE_2D,r),n.texStorage2D(n.TEXTURE_2D,1,n.RGBA32F,e,t),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),r}uploadNodes(e){let t=this.gl,n=1024*this.nodeRows*4;this.nodeStage&&this.nodeStage.length===n||(this.nodeStage=new Float32Array(n)),this.nodeStage.set(e),t.bindTexture(t.TEXTURE_2D,this.nodeTex),t.texSubImage2D(t.TEXTURE_2D,0,0,0,1024,this.nodeRows,t.RGBA,t.FLOAT,this.nodeStage)}makeTarget(e,t,n,r,i=!1){let a=this.gl,o=this.halfFloat?a.RGBA16F:a.RGBA8,s=a.createTexture();a.bindTexture(a.TEXTURE_2D,s),a.texStorage2D(a.TEXTURE_2D,1,o,e,t);let c=i?a.NEAREST:a.LINEAR;a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,c),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,c),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE);let l=a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,l),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,s,0);let u=[],d;if(n>1){d=a.createFramebuffer(),a.bindFramebuffer(a.FRAMEBUFFER,d);let i=a.createRenderbuffer();if(a.bindRenderbuffer(a.RENDERBUFFER,i),a.renderbufferStorageMultisample(a.RENDERBUFFER,n,o,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.RENDERBUFFER,i),u.push(i),r){let r=a.createRenderbuffer();a.bindRenderbuffer(a.RENDERBUFFER,r),a.renderbufferStorageMultisample(a.RENDERBUFFER,n,a.DEPTH_COMPONENT24,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.RENDERBUFFER,r),u.push(r)}}else if(r){let n=a.createRenderbuffer();a.bindRenderbuffer(a.RENDERBUFFER,n),a.renderbufferStorage(a.RENDERBUFFER,a.DEPTH_COMPONENT24,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.RENDERBUFFER,n),u.push(n)}let f=a.checkFramebufferStatus(a.FRAMEBUFFER);if(f!==a.FRAMEBUFFER_COMPLETE)throw Error(`FBO incomplete `+f);return a.bindFramebuffer(a.FRAMEBUFFER,null),{fbo:l,tex:s,msFbo:d,rbs:u,w:e,h:t}}freeTarget(e){if(!e)return;let t=this.gl;t.deleteFramebuffer(e.fbo),t.deleteTexture(e.tex),e.msFbo&&t.deleteFramebuffer(e.msFbo),e.rbs.forEach(e=>t.deleteRenderbuffer(e))}dispose(){let e=this.gl;for(let t of Object.values(this.progs))e.deleteProgram(t);for(let t of this.bufs)e.deleteBuffer(t);e.deleteBuffer(this.ubo),e.deleteTexture(this.nodeTex),e.deleteTexture(this.restTex);for(let t of[this.vaoOuter,this.vaoInner,this.vaoBub,this.vaoEmpty])e.deleteVertexArray(t);this.freeTarget(this.shadow),this.freeTarget(this.scene),this.freeTarget(this.back),this.freeTarget(this.shell),this.scene=this.back=this.shell=void 0}resize(e,t){e===this.W&&t===this.H&&this.scene||(this.W=e,this.H=t,this.canvas.width=e,this.canvas.height=t,this.freeTarget(this.scene),this.freeTarget(this.back),this.freeTarget(this.shell),this.scene=this.makeTarget(e,t,this.samples,!0),this.back=this.makeTarget(e,t,0,!0,!0),this.shell=this.makeTarget(e,t,this.samples,!0))}bindTex(e,t,n,r){let i=this.gl;i.activeTexture(i.TEXTURE0+n),i.bindTexture(i.TEXTURE_2D,r),i.uniform1i(i.getUniformLocation(e,t),n)}drawMesh(e,t,n){let r=this.gl;this.bindTex(e,`uNodes`,0,this.nodeTex),this.bindTex(e,`uRest`,1,this.restTex),r.bindVertexArray(t),r.drawElements(r.TRIANGLES,n,r.UNSIGNED_INT,0)}resolve(e){if(!e.msFbo)return;let t=this.gl;t.bindFramebuffer(t.READ_FRAMEBUFFER,e.msFbo),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,e.fbo),t.blitFramebuffer(0,0,e.w,e.h,0,0,e.w,e.h,t.COLOR_BUFFER_BIT,t.NEAREST),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null)}render(e){let t=this.gl,n=this.progs;e.nodeData&&this.uploadNodes(e.nodeData),t.bindBuffer(t.UNIFORM_BUFFER,this.ubo),t.bufferSubData(t.UNIFORM_BUFFER,0,e.frame),t.bindFramebuffer(t.FRAMEBUFFER,this.shadow.fbo),t.viewport(0,0,512,512),t.clearColor(0,0,0,10),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.DEPTH_TEST),t.disable(t.CULL_FACE),t.enable(t.BLEND),t.blendEquationSeparate(t.FUNC_ADD,t.MIN),t.blendFunc(t.ONE,t.ONE),t.useProgram(n.shadow),t.uniform1i(t.getUniformLocation(n.shadow,`uLight`),1),t.uniform1i(t.getUniformLocation(n.shadow,`uLayer`),0),this.drawMesh(n.shadow,this.vaoOuter,this.nOuter),t.uniform1i(t.getUniformLocation(n.shadow,`uLayer`),1),this.drawMesh(n.shadow,this.vaoInner,this.nInner),t.blendEquation(t.FUNC_ADD),t.disable(t.BLEND);let r=this.scene;t.bindFramebuffer(t.FRAMEBUFFER,r.msFbo??r.fbo),t.viewport(0,0,r.w,r.h),t.clearColor(0,0,0,1e3),t.clearDepth(1),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.useProgram(n.backdrop),this.bindTex(n.backdrop,`uShadow`,2,this.shadow.tex),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,3),t.enable(t.DEPTH_TEST),t.depthFunc(t.LESS),t.enable(t.CULL_FACE),t.cullFace(t.BACK),t.useProgram(n.inner),t.uniform1i(t.getUniformLocation(n.inner,`uLight`),0),this.bindTex(n.inner,`uShadow`,2,this.shadow.tex),this.drawMesh(n.inner,this.vaoInner,this.nInner),t.disable(t.CULL_FACE),t.useProgram(n.bead),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,96),t.enable(t.BLEND),t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ZERO,t.ONE),t.depthMask(!1),t.useProgram(n.bubble),this.bindTex(n.bubble,`uNodes`,0,this.nodeTex),t.bindVertexArray(this.vaoBub),t.drawArraysInstanced(t.TRIANGLE_STRIP,0,4,this.nBub),t.disable(t.BLEND),t.depthMask(!0),this.resolve(r);let i=this.back;t.bindFramebuffer(t.FRAMEBUFFER,i.fbo),t.viewport(0,0,i.w,i.h),t.clearColor(1e3,0,0,1),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.enable(t.CULL_FACE),t.cullFace(t.FRONT),t.useProgram(n.back),t.uniform1i(t.getUniformLocation(n.back,`uLight`),0),this.drawMesh(n.back,this.vaoOuter,this.nOuter);let a=this.shell;t.bindFramebuffer(t.FRAMEBUFFER,a.msFbo??a.fbo),t.viewport(0,0,a.w,a.h),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.cullFace(t.BACK),t.useProgram(n.shell),t.uniform1i(t.getUniformLocation(n.shell,`uLight`),0),this.bindTex(n.shell,`uScene`,2,r.tex),this.bindTex(n.shell,`uBack`,3,i.tex),this.drawMesh(n.shell,this.vaoOuter,this.nOuter),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),this.resolve(a),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.W,this.H),t.useProgram(n.composite),this.bindTex(n.composite,`uScene`,0,r.tex),this.bindTex(n.composite,`uShell`,1,a.tex),t.uniform4f(t.getUniformLocation(n.composite,`uParams`),e.exposure,e.time,1.5/255,.35),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,3)}},It=class{constructor(e,t,n,r,i,a){q(this,`asset`,void 0),q(this,`kind`,`webgl2`),q(this,`gl`,void 0),q(this,`worker`,void 0),q(this,`latest`,null),q(this,`fresh`,null),q(this,`inflight`,0),q(this,`cost`,0),q(this,`seq`,0),q(this,`substeps`,8),q(this,`presented`,0),q(this,`simSteps`,0),q(this,`ready`,void 0),this.asset=t,this.gl=new Ft(e,t,{msaa:i,look:a}),this.worker=new Worker(new URL(new URL(`worker-DKtvUjL9.js`,import.meta.url).href,``+import.meta.url),{type:`module`}),this.ready=new Promise((e,t)=>{this.worker.onmessage=t=>{let n=t.data;n.type===`ready`?e():n.type===`state`&&(this.inflight--,this.cost=this.cost*.9+n.cost*.1,this.fresh=n.nodeData,this.latest=n.nodeData,this.simSteps++)},this.worker.onerror=e=>t(e)}),this.worker.postMessage({type:`init`,buf:n.slice(0),character:r,substeps:this.substeps})}dispose(){this.worker.terminate(),this.gl.dispose()}step(e){if(this.inflight>1)return;this.cost>13&&this.substeps>6?this.substeps--:this.cost<7&&this.substeps<10&&this.substeps++;let t=e.grab;this.worker.postMessage({type:`step`,dt:e.dt,act:e.act,substeps:this.substeps,seq:this.seq++,grab:{active:t.active,count:t.count,idx:t.idx,off:t.off,wt:t.wt,target:t.target,twist:t.twist,axis:t.axis},beads:e.beads,beadCount:e.beadCount,spin:e.spin}),this.inflight++}render(e,t,n){let r=this.fresh;this.fresh=null,this.gl.render({frame:e,nodeData:r,exposure:t,time:n}),this.presented++}resize(e,t){this.gl.resize(e,t)}nodes(){return this.latest?{data:this.latest,stride:16}:null}reset(){this.worker.postMessage({type:`reset`})}simMs(){return this.cost}busy(){return this.inflight>1}},Z=e=>document.getElementById(e);function Lt(e){Z(`bar`).style.width=`${Math.round(e*100)}%`,Z(`pct`).textContent=`${Math.round(e*100)}%`}function Rt(){Z(`loader`).classList.add(`done`)}function zt(){Z(`fail`).hidden=!1,Z(`loader`).classList.add(`done`)}function Bt(e,t,n){let r=document.querySelector(`.colourways`);r.innerHTML=``,e.forEach((e,i)=>{let a=document.createElement(`button`),o=n?e.id===n:i===0;a.className=`cw`+(o?` active`:``),a.setAttribute(`role`,`radio`),a.setAttribute(`aria-checked`,o?`true`:`false`),a.dataset.id=e.id,a.innerHTML=`<span class="dot" style="background:${e.swatch}"></span><span class="en">${e.label}</span><span class="zh">${e.zh}</span>`,a.addEventListener(`click`,()=>{r.querySelectorAll(`.cw`).forEach(e=>{e.classList.remove(`active`),e.setAttribute(`aria-checked`,`false`)}),a.classList.add(`active`),a.setAttribute(`aria-checked`,`true`),t(e)}),r.appendChild(a)})}var Vt=(e,t)=>e.toFixed(t),Q=null,Ht=[];function Ut(e){Ht=e,Q=null;let t=document.querySelector(`.readouts`),n=(e,t,n,r)=>`<div class="ro"><span class="lab">${t} <b class="zh">${n}</b></span><span class="val"><span id="${e}">—</span><small>${r}</small></span></div>`;t.innerHTML=n(`ro-mass`,`Mass`,`质量`,`g`)+n(`ro-vol`,`Volume`,`体积`,`ml`)+e.map((e,t)=>n(`ro-m${t}`,e.label,e.zh,`cm`)).join(``)}function Wt(e){Q&&Q.metrics.length===e.metrics.length||(Q={...e,metrics:[...e.metrics]});let t=.45;Q.massG+=(e.massG-Q.massG)*t,Q.volumeMl+=(e.volumeMl-Q.volumeMl)*t,e.metrics.forEach((e,n)=>{Q.metrics[n]+=(e-Q.metrics[n])*t}),Z(`ro-mass`).textContent=Vt(Q.massG,1),Z(`ro-vol`).textContent=Vt(Q.volumeMl,1),Q.metrics.forEach((e,t)=>{let n=document.getElementById(`ro-m${t}`);n&&(n.textContent=Vt(e,Ht[t]?.decimals??2))})}function Gt(e,t,n){let r=document.querySelector(`.title em`),i=document.querySelector(`.subtitle`),a=document.querySelector(`.kicker .num`);r.textContent=e,i.textContent=t,a.innerHTML=`No.&nbsp;${n}`,document.title=`Jelly Studies — No. ${n} ${e}`}function Kt(e){document.querySelectorAll(`.char`).forEach(t=>{let n=t.dataset.char===e;t.classList.toggle(`active`,n),t.setAttribute(`aria-pressed`,n?`true`:`false`)})}function qt(e,t){document.querySelectorAll(`.char`).forEach(n=>{let r=n.dataset.char,i=e.includes(r);n.classList.toggle(`soon`,!i),i&&(n.removeAttribute(`aria-disabled`),n.removeAttribute(`title`),n.querySelector(`i`)?.remove()),n.onclick=i?()=>t(r):null})}async function Jt(e){document.getElementById(`veil`).classList.toggle(`on`,e),await new Promise(t=>setTimeout(t,e?380:10))}function Yt(){Z(`hint`).classList.add(`gone`)}function Xt(e){Z(`colophon`).textContent=e}var Zt=`modulepreload`,Qt=function(e,t){return new URL(e,t).href},$t={},en=function(e){return e.pathname.endsWith(`.css`)},tn=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},nn=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=Qt(t,n);let r=s(t),i=en(r);return tn($t,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:Zt,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},$=new URLSearchParams(location.search),rn=matchMedia(`(pointer: coarse)`).matches||/Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent);async function an(e,t){let n=await fetch(e);if(!n.ok||!n.body)throw Error(`asset ${e}: ${n.status}`);let r=+(n.headers.get(`content-length`)||0),i=n.body.getReader(),a=[],o=0;for(;;){let{done:e,value:n}=await i.read();if(e)break;a.push(n),o+=n.length,r&&t(o/r)}let s=new Uint8Array(o),c=0;for(let e of a)s.set(e,c),c+=e.length;return s.buffer}async function on(){if($.get(`backend`)===`webgl2`||!(`gpu`in navigator))return null;try{let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});return e?{adapter:e,device:await e.requestDevice({requiredLimits:{maxStorageBuffersPerShaderStage:Math.min(8,e.limits.maxStorageBuffersPerShaderStage)}})}:null}catch(e){return console.info(`WebGPU unavailable:`,e),null}}var sn=new Map;async function cn(e,t,n){let r=`${e}/${t}`;return sn.has(r)||sn.set(r,await an(`./assets/${r}.bin`,n)),sn.get(r)}async function ln(){let e=document.getElementById(`gl`),t=ut.filter(e=>e.ready),r=t.find(e=>e.id===$.get(`char`))??t[0];Lt(.05);let i=await on(),a=null,o=``,s=+($.get(`dpr`)||2),c=`webgl2`,l=async(t,r)=>{if(c===`webgpu`){let a=n(await cn(t.id,o,r),t.actuation,1),{GPUPath:s}=await nn(async()=>{let{GPUPath:e}=await import(`./gpupath-BKv5Jfk2.js`);return{GPUPath:e}},[],import.meta.url),c=new s(e,a,i.device,4,t.look);return await c.ready,c}let a=await cn(t.id,o,r),s=n(a,t.actuation,1),l=new It(e,s,a,t.id,rn?0:4,t.look);return await l.ready,l},u=e=>Lt(.05+e*.85);if(i){o=$.get(`q`)||(rn?`md`:`hi`),c=`webgpu`;try{a=await l(r,u)}catch(t){console.warn(`WebGPU path failed, falling back to WebGL2:`,t),a=null;let n=e.cloneNode(!1);e.replaceWith(n),e=n;try{i.device.destroy()}catch{}}}a||(o=$.get(`q`)||`lo`,c=`webgl2`,a=await l(r,u)),Lt(1);let d=a.kind===`webgpu`,f=new xt(e,a,r,s,d,rn&&innerWidth<innerHeight);window.__jelly=f;let p=$.get(`cam`);(()=>{if(p){let[e,t,n]=p.split(`,`).map(Number);Object.assign(f.camGoal,{yaw:e,pitch:t,zoom:n??1}),Object.assign(f.cam,{yaw:e,pitch:t,zoom:n??1})}$.get(`tgt`)&&(f.cam.target=$.get(`tgt`).split(`,`).map(Number))})();let m=()=>{let e=f.path.asset;Xt(`${c===`webgpu`?`WebGPU compute`:`WebGL 2 · CPU worker`} · ${e.meta.tets.toLocaleString(`en-US`)} tetrahedra · ${(e.meta.outer.tris+e.meta.inner.tris).toLocaleString(`en-US`)} triangles`)},h=t=>{Gt(t.name,t.subtitle,t.num),Kt(t.id),Ut(t.metrics),Bt(t.colourways,e=>{f.setColour(e),g()}),e.setAttribute(`aria-label`,`Interactive jelly ${t.name.toLowerCase()}`),g(),m()},g=()=>{let e=f.colour.bgBot,t=f.colour.bgTop,n=e=>`rgb(${e.map(e=>Math.round(255*Math.min(1,e)**(1/2.2))).join(`,`)})`;document.documentElement.style.setProperty(`--veil`,`linear-gradient(${n(t)}, ${n(e)})`)};f.onReadouts=e=>Wt(e),f.onFirstInteract=()=>Yt(),h(r);let _=!1,v=async e=>{let t=ut.find(t=>t.id===e&&t.ready);if(t&&t!==r&&!_){_=!0,Kt(e);try{let[,n]=await Promise.all([Jt(!0),l(t,()=>{})]);f.stop();let i=f.path;f.setCharacter(n,t),i.dispose(),r=t,h(r),f.resize(),f.start(),history.replaceState(null,``,`?${new URLSearchParams({...Object.fromEntries($),char:e})}`),await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(e))),await Jt(!1)}catch(e){console.error(`character switch failed`,e),Kt(r.id),await Jt(!1)}_=!1}};qt(t.map(e=>e.id),v),window.__switchTo=v;let y=()=>f.resize();addEventListener(`resize`,y),new ResizeObserver(y).observe(e),f.resize(),document.getElementById(`bait`).addEventListener(`click`,()=>{f.dropBait(),Yt()}),document.getElementById(`reset`).addEventListener(`click`,()=>f.reset()),document.addEventListener(`visibilitychange`,()=>{document.hidden?f.stop():f.start()}),f.start(),requestAnimationFrame(()=>requestAnimationFrame(()=>Rt())),window.__jellyReady={backend:a.kind,level:o,tets:a.asset.meta.tets}}ln().catch(e=>{console.error(e),zt()});export{pt as n,ft as r,q as t};