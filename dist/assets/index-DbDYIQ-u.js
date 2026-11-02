var e=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},t=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t,t.exports),e=null),t.exports);(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n=e((()=>{}));function r(e){let t=new Uint8Array(e);if(new TextDecoder().decode(t.subarray(0,4))!==`JLY1`)throw Error(`bad asset`);let n=new DataView(e).getUint32(4,!0),r=JSON.parse(new TextDecoder().decode(t.subarray(8,8+n))),a={};for(let[t,o]of Object.entries(r.sections)){let r=i[o.type];a[t]=new r(e,8+n+o.offset,o.length)}return{meta:r.meta,s:a}}var i,a=e((()=>{i={Float32Array,Uint32Array,Uint16Array,Int16Array,Uint8Array,Int32Array}}));function o(e,t,n){let{meta:i,s:a}=r(e),o=a.nodes,s=a.tets,c=o.length/3,l=s.length/4,u=new Float32Array(l*9),d=new Float32Array(l),f=new Float32Array(c),p=new Float32Array(l*t.channels),m=new Float32Array(l),h=new Float32Array(t.channels);for(let e=0;e<l;e++){let r=s[4*e]*3,i=[];for(let t=0;t<3;t++)for(let n=0;n<3;n++)i.push(o[s[4*e+1+n]*3+t]-o[r+t]);let[a,c,l,g,_,v,y,b,x]=i,S=a*(_*x-v*b)-c*(g*x-v*y)+l*(g*b-_*y),C=1/S;u.set([(_*x-v*b)*C,(l*b-c*x)*C,(c*v-l*_)*C,(v*y-g*x)*C,(a*x-l*y)*C,(l*g-a*v)*C,(g*b-_*y)*C,(c*y-a*b)*C,(a*_-c*g)*C],9*e),d[e]=S/6;for(let t=0;t<4;t++)f[s[4*e+t]]+=S/6/4*n;let w=0,T=0,E=0;for(let t=0;t<4;t++){let n=s[4*e+t]*3;w+=o[n]/4,T+=o[n+1]/4,E+=o[n+2]/4}t.weights(w,T,E,h),p.set(h,e*t.channels),m[e]=t.stiffness?t.stiffness(w,T,E):1}let g=new Float32Array(c),_=new Float32Array(c);for(let e=0;e<c;e++)g[e]=t.friction?t.friction(o[3*e],o[3*e+1],o[3*e+2]):1,_[e]=t.gravity?t.gravity(o[3*e],o[3*e+1],o[3*e+2]):1;let v=new Float32Array(c);for(let e=0;e<c;e++)v[e]=f[e]>0?1/f[e]:0;let y=new Uint32Array(c+1);for(let e=0;e<l*4;e++)y[s[e]+1]++;for(let e=0;e<c;e++)y[e+1]+=y[e];let b=y.slice(0,c),x=new Uint32Array(l*4);for(let e=0;e<l;e++)for(let t=0;t<4;t++)x[b[s[4*e+t]]++]=e;return{meta:i,nodes:o,tets:s,colourOffsets:a.colourOffsets,finW:a.finW,B:u,restVol:d,invMass:v,mass:f,muscle:p,stiff:m,fric:g,grav:_,channels:t.channels,adjOffsets:y,adjTets:x,s:a}}var s=e((()=>{a()}));function c(e,t,n,r){let i=Math.hypot(e/n,t/r);if(i<1e-9)return-Math.min(n,r);let a=Math.hypot(e/(n*n),t/(r*r));return i*(i-1)/a}function l(e,t){return Math.hypot(Math.max(e,0),Math.max(t,0))+Math.min(Math.max(e,t),0)}function u(e,t){let n=e.length;return r=>{if(r<=e[0])return t[0];if(r>=e[n-1])return t[n-1];let i=0;for(;i<n-2&&r>e[i+1];)i++;let a=e[i],o=e[i+1],s=(r-a)/(o-a),c=t[Math.max(i-1,0)],l=t[i],u=t[i+1],d=t[Math.min(i+2,n-1)],f=(u-c)/(e[i+1]-e[Math.max(i-1,0)]||1)*(o-a),p=(d-l)/(e[Math.min(i+2,n-1)]-e[i]||1)*(o-a),m=s*s,h=m*s;return(2*h-3*m+1)*l+(h-2*m+s)*f+(-2*h+3*m)*u+(h-m)*p}}function d(e){let t=_.norm(e.U),n=_.sub(e.V,_.scale(t,_.dot(e.V,t)));n=_.norm(n);let r=_.norm(_.cross(t,n));return{spec:e,U:t,V:n,N:r}}var f,p,m,h,g,_,v=e((()=>{f=(e,t,n)=>e<t?t:e>n?n:e,p=(e,t,n)=>e+(t-e)*n,m=(e,t,n)=>{let r=f((n-e)/(t-e),0,1);return r*r*(3-2*r)},h=(e,t,n)=>{if(n<=0)return Math.min(e,t);let r=Math.max(n-Math.abs(e-t),0)/n;return Math.min(e,t)-r*r*n*.25},g=(e,t,n)=>-h(-e,-t,n),_={sub:(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],add:(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],scale:(e,t)=>[e[0]*t,e[1]*t,e[2]*t],dot:(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],cross:(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],len:e=>Math.hypot(e[0],e[1],e[2]),norm:e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}}}));function y(e,t,n){let r=f(e,E,ee),i=C(r),a=w(r),o=c(n,t-T(r),i,a),s=Math.abs(e-r);return s>0?Math.hypot(Math.max(o,0),s)+Math.min(o,0)*0:o}function b(e,t,n){let r=O(n),i=te(n),a=Math.max(e-r,i-e),o=Math.abs(n)-D,s=g(a,o,.028),c=f((r-e)/(r-i),0,1),u=Math.min(1.6*Math.sqrt(c)*(1-c)**.9/.64,1),d=m(.196,D,Math.abs(n)),h=Math.max(ne(n)*u,.0035)*p(1,.85,d),_=Math.abs(t-k(n))-h,v=Math.min(h*.95,.008);return l(s+v,_+v)-v}function x(e,t,n){return h(y(e,t,n),b(e,t,n),.045)}var S,C,w,T,E,ee,D,O,te,k,ne,A,j,re,ie=e((()=>{v(),S=[-.42,-.36,-.29,-.2,-.09,.03,.14,.24,.33,.4,.47],C=u(S,[.01,.016,.028,.046,.06,.069,.073,.064,.047,.04,.03]),w=u(S,[.016,.022,.036,.057,.075,.089,.095,.08,.053,.04,.026]),T=u(S,[.08,.078,.076,.08,.087,.093,.096,.083,.064,.056,.05]),E=-.42,ee=.47,D=.226,O=e=>{let t=Math.abs(e)/D;return .505-.018*t*t-.0085*Math.exp(-(e*e)/(.011*.011))},te=e=>{let t=Math.abs(e)/D;return O(e)-(.072+.045*Math.exp(-(e*e)/.003025))-.03*t*t},k=e=>.05-e*e*.006/(D*D),ne=e=>.019+.012*Math.exp(-(e*e)/(.065*.065)),A=e=>[O(D)-.022,k(D)+.004,e*.218],j=e=>({lePow:2,falcate:0,tmin:.0042,bury:.35,...e}),re=[j({name:`dorsal1`,o:[.135,.15,0],U:[-1,0,0],V:[-.05,1,0],H:.25,C:.155,sweep:.155,falcate:.075,t0:.018,lePow:2.1}),j({name:`dorsal2`,o:[-.215,.095,0],U:[-1,0,0],V:[-.1,1,0],H:.066,C:.056,sweep:.046,falcate:.014,t0:.0085}),j({name:`pectoralL`,o:[.235,.04,.04],U:[-1,0,.12],V:[-.18,-.22,1],H:.17,C:.09,sweep:.09,falcate:.03,t0:.012}),j({name:`pectoralR`,o:[.235,.04,-.04],U:[-1,0,-.12],V:[-.18,-.22,-1],H:.17,C:.09,sweep:.09,falcate:.03,t0:.012}),j({name:`pelvicL`,o:[-.095,.03,.022],U:[-1,0,.1],V:[-.3,-.42,1],H:.082,C:.055,sweep:.05,falcate:.02,t0:.0075}),j({name:`pelvicR`,o:[-.095,.03,-.022],U:[-1,0,-.1],V:[-.3,-.42,-1],H:.082,C:.055,sweep:.05,falcate:.02,t0:.0075}),j({name:`anal`,o:[-.225,.052,0],U:[-1,0,0],V:[-.35,-1,0],H:.056,C:.05,sweep:.04,falcate:.015,t0:.007}),j({name:`caudalUpper`,o:[-.362,.09,0],U:[-.75,-1,0],V:[-1,.75,0],H:.3,C:.105,sweep:.02,lePow:1.5,falcate:.016,t0:.013,bury:.12,notch:{s:.8,w:.03,depth:.6}}),j({name:`caudalLower`,o:[-.39,.074,0],U:[-.55,1,0],V:[-1,-.55,0],H:.15,C:.066,sweep:.032,falcate:.024,t0:.011,bury:.15})],re.map(d),O(0)-.004,k(0),A(1),A(-1)})),M,ae=e((()=>{v(),ie(),M={channels:2,weights(e,t,n,r){let i=m(.02,-.004,x(e,t,n)),a=f(n/(C(f(e,-.42,.47))*.75),-1,1),o=m(.1,.2,e)*(1-m(.33,.4,e)),s=m(-.02,-.14,e)*(1-m(-.36,-.4,e)*.5);r[0]=a*o*i,r[1]=a*s*i},stiffness(e){return 1+1.6*m(.22,.4,e)+10*m(-.26,-.37,e)},friction(e){return 1-.92*m(.3,.4,e)},gravity(e,t,n){return 1-.8*m(0,.035,x(e,t,n))},activation(e,t){t[0]=.28*Math.sin(2*Math.PI*e/5.2);let n=m(.15,.85,.5+.5*Math.sin(2*Math.PI*e/7+1.3));t[1]=.13*Math.sin(2*Math.PI*e/1.5)*n}}})),oe,se,N,ce,le=e((()=>{oe=[{id:`steel`,label:`Steel`,zh:`钢灰`,absorb:[5,3,1.9],back:[.42,.5,.58,.6],finTip:[.2,.24,.3,.8],belly:[.93,.935,.93,1],glow:[.62,.78,.92,1],bead:[.95,.45,.32,1],swatch:`#7d8b97`,bgTop:[.5,.5,.495],bgBot:[.36,.36,.355],floor:[.66,.655,.645]},{id:`amber`,label:`Amber`,zh:`琥珀`,absorb:[.5,2.8,9],back:[.62,.38,.14,.55],finTip:[.35,.18,.06,.8],belly:[.98,.93,.82,1],glow:[1,.7,.3,1],bead:[.85,.15,.2,1],swatch:`#c98a2e`,bgTop:[.52,.505,.49],bgBot:[.37,.36,.35],floor:[.67,.655,.635]},{id:`gummy`,label:`Gummy Blue`,zh:`软糖蓝`,absorb:[13,4.6,.8],back:[.18,.33,.78,.6],finTip:[.05,.1,.4,.8],belly:[.9,.94,1,1],glow:[.35,.62,1,1],bead:[1,.55,.15,1],swatch:`#2f63d6`,bgTop:[.5,.505,.51],bgBot:[.355,.36,.365],floor:[.655,.66,.665]}],se=`float hammerFront(float z){ float q = abs(z)/0.226; return 0.505 - 0.018*q*q - 0.0085*exp(-(z*z)/(0.011*0.011)); }`,N=`
${se}
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
`,ce=`
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
`})),ue,de=e((()=>{ae(),le(),ue=[{id:`shark`,name:`Great Hammerhead`,zh:`无沟双髻鲨`,ready:!0,actuation:M,colourways:oe,camera:{target:[-.03,.09,0],yaw:.62,pitch:.46,radius:.66}},{id:`pig`,name:`Pig`,zh:`小猪`,ready:!1},{id:`cat`,name:`Cat`,zh:`小猫`,ready:!1}]})),P,fe=e((()=>{P={create(){let e=new Float32Array(16);return e[0]=e[5]=e[10]=e[15]=1,e},perspective(e,t,n,r,i,a){let o=1/Math.tan(t/2);return e.fill(0),e[0]=o/n,e[5]=o,e[11]=-1,a?(e[10]=i/(r-i),e[14]=i*r/(r-i)):(e[10]=(i+r)/(r-i),e[14]=2*i*r/(r-i)),e},ortho(e,t,n,r,i,a,o,s){return e.fill(0),e[0]=2/(n-t),e[5]=2/(i-r),e[12]=-(n+t)/(n-t),e[13]=-(i+r)/(i-r),e[15]=1,s?(e[10]=-1/(o-a),e[14]=-a/(o-a)):(e[10]=-2/(o-a),e[14]=-(o+a)/(o-a)),e},lookAt(e,t,n,r){let i=t[0]-n[0],a=t[1]-n[1],o=t[2]-n[2],s=Math.hypot(i,a,o);i/=s,a/=s,o/=s;let c=r[1]*o-r[2]*a,l=r[2]*i-r[0]*o,u=r[0]*a-r[1]*i;s=Math.hypot(c,l,u),c/=s,l/=s,u/=s;let d=a*u-o*l,f=o*c-i*u,p=i*l-a*c;return e[0]=c,e[1]=d,e[2]=i,e[3]=0,e[4]=l,e[5]=f,e[6]=a,e[7]=0,e[8]=u,e[9]=p,e[10]=o,e[11]=0,e[12]=-(c*t[0]+l*t[1]+u*t[2]),e[13]=-(d*t[0]+f*t[1]+p*t[2]),e[14]=-(i*t[0]+a*t[1]+o*t[2]),e[15]=1,e},mul(e,t,n){let r=new Float32Array(16);for(let e=0;e<4;e++)for(let i=0;i<4;i++)r[e*4+i]=t[i]*n[e*4]+t[4+i]*n[e*4+1]+t[8+i]*n[e*4+2]+t[12+i]*n[e*4+3];return e.set(r),e},invert(e,t){let n=t,r=new Float32Array(16);r[0]=n[5]*n[10]*n[15]-n[5]*n[11]*n[14]-n[9]*n[6]*n[15]+n[9]*n[7]*n[14]+n[13]*n[6]*n[11]-n[13]*n[7]*n[10],r[4]=-n[4]*n[10]*n[15]+n[4]*n[11]*n[14]+n[8]*n[6]*n[15]-n[8]*n[7]*n[14]-n[12]*n[6]*n[11]+n[12]*n[7]*n[10],r[8]=n[4]*n[9]*n[15]-n[4]*n[11]*n[13]-n[8]*n[5]*n[15]+n[8]*n[7]*n[13]+n[12]*n[5]*n[11]-n[12]*n[7]*n[9],r[12]=-n[4]*n[9]*n[14]+n[4]*n[10]*n[13]+n[8]*n[5]*n[14]-n[8]*n[6]*n[13]-n[12]*n[5]*n[10]+n[12]*n[6]*n[9],r[1]=-n[1]*n[10]*n[15]+n[1]*n[11]*n[14]+n[9]*n[2]*n[15]-n[9]*n[3]*n[14]-n[13]*n[2]*n[11]+n[13]*n[3]*n[10],r[5]=n[0]*n[10]*n[15]-n[0]*n[11]*n[14]-n[8]*n[2]*n[15]+n[8]*n[3]*n[14]+n[12]*n[2]*n[11]-n[12]*n[3]*n[10],r[9]=-n[0]*n[9]*n[15]+n[0]*n[11]*n[13]+n[8]*n[1]*n[15]-n[8]*n[3]*n[13]-n[12]*n[1]*n[11]+n[12]*n[3]*n[9],r[13]=n[0]*n[9]*n[14]-n[0]*n[10]*n[13]-n[8]*n[1]*n[14]+n[8]*n[2]*n[13]+n[12]*n[1]*n[10]-n[12]*n[2]*n[9],r[2]=n[1]*n[6]*n[15]-n[1]*n[7]*n[14]-n[5]*n[2]*n[15]+n[5]*n[3]*n[14]+n[13]*n[2]*n[7]-n[13]*n[3]*n[6],r[6]=-n[0]*n[6]*n[15]+n[0]*n[7]*n[14]+n[4]*n[2]*n[15]-n[4]*n[3]*n[14]-n[12]*n[2]*n[7]+n[12]*n[3]*n[6],r[10]=n[0]*n[5]*n[15]-n[0]*n[7]*n[13]-n[4]*n[1]*n[15]+n[4]*n[3]*n[13]+n[12]*n[1]*n[7]-n[12]*n[3]*n[5],r[14]=-n[0]*n[5]*n[14]+n[0]*n[6]*n[13]+n[4]*n[1]*n[14]-n[4]*n[2]*n[13]-n[12]*n[1]*n[6]+n[12]*n[2]*n[5],r[3]=-n[1]*n[6]*n[11]+n[1]*n[7]*n[10]+n[5]*n[2]*n[11]-n[5]*n[3]*n[10]-n[9]*n[2]*n[7]+n[9]*n[3]*n[6],r[7]=n[0]*n[6]*n[11]-n[0]*n[7]*n[10]-n[4]*n[2]*n[11]+n[4]*n[3]*n[10]+n[8]*n[2]*n[7]-n[8]*n[3]*n[6],r[11]=-n[0]*n[5]*n[11]+n[0]*n[7]*n[9]+n[4]*n[1]*n[11]-n[4]*n[3]*n[9]-n[8]*n[1]*n[7]+n[8]*n[3]*n[5],r[15]=n[0]*n[5]*n[10]-n[0]*n[6]*n[9]-n[4]*n[1]*n[10]+n[4]*n[2]*n[9]+n[8]*n[1]*n[6]-n[8]*n[2]*n[5];let i=n[0]*r[0]+n[1]*r[4]+n[2]*r[8]+n[3]*r[12];i=1/i;for(let t=0;t<16;t++)e[t]=r[t]*i;return e},transformPoint(e,t,n,r){return[e[0]*t+e[4]*n+e[8]*r+e[12],e[1]*t+e[5]*n+e[9]*r+e[13],e[2]*t+e[6]*n+e[10]*r+e[14],e[3]*t+e[7]*n+e[11]*r+e[15]]}}})),F,pe,I=e((()=>{F={viewProj:0,view:16,proj:32,invViewProj:48,lightVP:64,camPos:80,res:84,qmin:88,qext:92,absorb:96,backCol:100,finTipCol:104,bellyCol:108,glowCol:112,studio:116,misc:120,beadCol:124,beads:128,lightDir:192,bgTop:196,bgBot:200,extra:204},pe=`
layout(std140) uniform Frame {
  mat4 viewProj; mat4 view; mat4 proj; mat4 invViewProj; mat4 lightVP;
  vec4 camPos; vec4 res; vec4 qmin; vec4 qext; vec4 absorb; vec4 backCol; vec4 finTipCol; vec4 bellyCol; vec4 glowCol;
  vec4 studio; vec4 misc; vec4 beadCol; vec4 beads[16]; vec4 lightDir; vec4 bgTop; vec4 bgBot; vec4 extra;
} fr;
`})),me,L=e((()=>{me={gravity:39.2,density:1,muBody:90,muFin:2500,lambdaRatio:150,damping:1.2,substeps:10,frictionStatic:1.2,frictionKinetic:.9,grabStiffness:.12}}));function R(e){"@babel/helpers - typeof";return R=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},R(e)}var z=e((()=>{}));function he(e,t){if(R(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(R(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var ge=e((()=>{z()}));function _e(e){var t=he(e,`string`);return R(t)==`symbol`?t:t+``}var ve=e((()=>{z(),ge()}));function B(e,t,n){return(t=_e(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var V=e((()=>{ve()}));function ye(e){return{active:!1,count:0,idx:new Int32Array(e),off:new Float32Array(e*3),wt:new Float32Array(e),target:new Float32Array(3),twist:0,axis:new Float32Array([0,0,1])}}var be=e((()=>{})),xe,Se=e((()=>{L(),V(),xe=class{constructor(){B(this,`pos`,new Float32Array(64)),B(this,`vel`,new Float32Array(48)),B(this,`count`,0),B(this,`next`,0)}spawn(e,t,n,r){let i;this.count<16?i=this.count++:(i=this.next,this.next=(this.next+1)%16),this.pos.set([e,t,n,r],4*i),this.vel.set([0,0,0],3*i)}clear(){this.count=0,this.next=0}step(e,t,n,r,i,a){let o=Math.min(e,1/30)/4,s=this.pos,c=this.vel;for(let e=0;e<4;e++){for(let e=0;e<this.count;e++){c[3*e+1]-=a*o;let l=Math.exp(-.8*o);c[3*e]*=l,c[3*e+1]*=l,c[3*e+2]*=l,s[4*e]+=c[3*e]*o,s[4*e+1]+=c[3*e+1]*o,s[4*e+2]+=c[3*e+2]*o;let u=s[4*e+3];if(s[4*e+1]<u){s[4*e+1]=u,c[3*e+1]<0&&(c[3*e+1]*=-.25);let t=Math.exp(-9*o);c[3*e]*=t,c[3*e+2]*=t}if(t){let a=0,l=0,d=0,f=0;for(let o=0;o<r;o++){let r=o*n,c=s[4*e]-t[r],p=s[4*e+1]-t[r+1],m=s[4*e+2]-t[r+2],h=u+i,g=c*c+p*p+m*m;if(g<h*h&&g>1e-12){let e=Math.sqrt(g),t=h-e;a+=c/e*t,l+=p/e*t,d+=m/e*t,f++}}if(f){let t=.5/Math.sqrt(f);s[4*e]+=a*t,s[4*e+1]+=l*t,s[4*e+2]+=d*t;let n=Math.hypot(a,l,d)||1,r=a/n,i=l/n,u=d/n,p=c[3*e]*r+c[3*e+1]*i+c[3*e+2]*u;p<0&&(c[3*e]-=p*r*1.2,c[3*e+1]-=p*i*1.2,c[3*e+2]-=p*u*1.2);let m=Math.exp(-5*o);c[3*e]*=m,c[3*e+2]*=m}}}for(let e=0;e<this.count;e++)for(let t=e+1;t<this.count;t++){let n=s[4*e]-s[4*t],r=s[4*e+1]-s[4*t+1],i=s[4*e+2]-s[4*t+2],a=s[4*e+3]+s[4*t+3],o=n*n+r*r+i*i;if(o<a*a&&o>1e-12){let c=Math.sqrt(o),l=(a-c)/c*.5;s[4*e]+=n*l,s[4*e+1]+=r*l,s[4*e+2]+=i*l,s[4*t]-=n*l,s[4*t+1]-=r*l,s[4*t+2]-=i*l}}}}}})),H,Ce,we=e((()=>{fe(),I(),be(),L(),Se(),V(),H=[-.28,1,-.62],Ce=class{constructor(e,t,n,r,i,a){B(this,`canvas`,void 0),B(this,`path`,void 0),B(this,`actuation`,void 0),B(this,`dprCap`,void 0),B(this,`zeroToOne`,void 0),B(this,`frame`,new Float32Array(208)),B(this,`view`,P.create()),B(this,`proj`,P.create()),B(this,`vp`,P.create()),B(this,`ivp`,P.create()),B(this,`lvp`,P.create()),B(this,`cam`,{yaw:.62,pitch:.42,zoom:1,target:[-.03,.085,0],eye:[0,0,0],fov:.5}),B(this,`camGoal`,{yaw:.62,pitch:.42,zoom:1}),B(this,`grab`,ye(64)),B(this,`beads`,new xe),B(this,`act`,void 0),B(this,`simTime`,0),B(this,`last`,0),B(this,`running`,!1),B(this,`time`,0),B(this,`colour`,void 0),B(this,`colourMix`,1),B(this,`prevColour`,void 0),B(this,`readouts`,{massG:0,volumeMl:0,forkCm:0,eyeCm:0}),B(this,`onReadouts`,void 0),B(this,`onFirstInteract`,void 0),B(this,`fps`,0),B(this,`frames`,0),B(this,`fpsT`,0),B(this,`frameMs`,0),B(this,`W`,1),B(this,`H`,1),B(this,`dpr`,1),B(this,`volRatio`,void 0),B(this,`tetRestVol`,void 0),B(this,`twistDecay`,0),B(this,`wheelTimer`,0),B(this,`loop`,e=>{if(!this.running)return;requestAnimationFrame(this.loop);let t=performance.now(),n=Math.min(Math.max((e-this.last)/1e3,1/240),.25),r=Math.min(n,1/30);this.last=e,this.colourMix<1&&(this.colourMix=Math.min(1,this.colourMix+n*1.6)),this.time+=r,this.frames++,e-this.fpsT>500&&(this.fps=this.frames*1e3/(e-this.fpsT),this.frames=0,this.fpsT=e),this.update(r),this.frameMs=this.frameMs*.9+(performance.now()-t)*.1}),B(this,`roT`,0),B(this,`pointers`,new Map),B(this,`mode`,`none`),B(this,`grabPlane`,{p:[0,0,0],n:[0,0,1]}),B(this,`twistStart`,0),B(this,`twistBase`,0),B(this,`pinchStart`,0),B(this,`zoomStart`,1),B(this,`orbitStart`,{x:0,y:0,yaw:0,pitch:0}),B(this,`interacted`,!1),this.canvas=e,this.path=t,this.actuation=n,this.dprCap=i,this.zeroToOne=a,this.act=new Float32Array(n.channels),this.colour=this.prevColour=r[0];let o=t.asset;this.tetRestVol=o.restVol.reduce((e,t)=>e+t,0),this.volRatio=o.meta.surfVolume/o.meta.tetVolume,this.bindInput()}setColour(e){this.prevColour=this.colourNow(),this.colour=e,this.colourMix=0}colourNow(){if(this.colourMix>=1)return this.colour;let e=this.colourMix*this.colourMix*(3-2*this.colourMix),t=(t,n)=>t.map((t,r)=>t+(n[r]-t)*e),n=this.prevColour,r=this.colour;return{...r,absorb:t(n.absorb,r.absorb),back:t(n.back,r.back),finTip:t(n.finTip,r.finTip),belly:t(n.belly,r.belly),glow:t(n.glow,r.glow),bead:t(n.bead,r.bead),bgTop:t(n.bgTop,r.bgTop),bgBot:t(n.bgBot,r.bgBot),floor:t(n.floor,r.floor)}}start(){this.running=!0,this.last=performance.now(),requestAnimationFrame(this.loop)}stop(){this.running=!1}resize(){let e=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,this.dprCap),this.W=Math.max(2,Math.round(e.width*this.dpr)),this.H=Math.max(2,Math.round(e.height*this.dpr)),this.path.resize(this.W,this.H)}dropBait(){let e=.016+Math.random()*.008,t=Math.random(),n,r;t<.65?(n=.58+Math.random()*.14,r=(Math.random()-.5)*.36):(n=-.2+Math.random()*.5,r=(Math.random()-.5)*.12),this.beads.spawn(n,.42+Math.random()*.1,r,e)}reset(){this.path.reset(),this.beads.clear(),this.grab.active=!1,this.simTime=0}update(e){this.simTime+=Math.min(e,1/60),this.actuation.activation(this.simTime,this.act),this.wheelTimer>0&&(this.wheelTimer-=e,this.wheelTimer<=0&&this.pointers.size===0&&(this.grab.active=!1,this.grab.twist=0));let t=this.path.nodes();this.beads.step(e,t?.data??null,t?.stride??4,this.path.asset.nodes.length/3,this.path.asset.meta.h*.42,me.gravity),this.path.step({dt:Math.min(e,1/60),act:this.act,grab:this.grab,beads:this.beads.pos,beadCount:this.beads.count}),this.updateCamera(e),this.writeFrame(),this.path.render(this.frame,1,this.time),this.updateReadouts(e)}updateCamera(e){let t=1-Math.exp(-e*8),n=this.cam,r=this.camGoal;n.yaw+=(r.yaw-n.yaw)*t,n.pitch+=(r.pitch-n.pitch)*t,n.zoom+=(r.zoom-n.zoom)*t;let i=this.W/this.H,a=i<.85;n.fov=a?.62:.48;let o=Math.tan(n.fov/2),s=o*i,c=.6*Math.abs(Math.cos(n.yaw))+.24*Math.abs(Math.sin(n.yaw)),l=Math.max(c/s,.24/o)*1.32+.2;l*=n.zoom;let u=[n.target[0],n.target[1]+(a?.02:0),n.target[2]];n.eye=[u[0]+l*Math.sin(n.yaw)*Math.cos(n.pitch),u[1]+l*Math.sin(n.pitch),u[2]+l*Math.cos(n.yaw)*Math.cos(n.pitch)],P.lookAt(this.view,n.eye,u,[0,1,0]),P.perspective(this.proj,n.fov,i,.05,40,this.zeroToOne),P.mul(this.vp,this.proj,this.view),P.invert(this.ivp,this.vp);let d=H,f=Math.hypot(d[0],d[1],d[2]),p=d.map(e=>e/f),m=P.create(),h=P.create();P.lookAt(m,[p[0]*3,p[1]*3,p[2]*3],[0,0,0],[1,0,0]),P.ortho(h,-.85,.85,-.85,.85,.5,6,this.zeroToOne),P.mul(this.lvp,h,m)}writeFrame(){let e=this.frame,t=this.path.asset,n=this.colourNow();e.set(this.vp,F.viewProj),e.set(this.view,F.view),e.set(this.proj,F.proj),e.set(this.ivp,F.invViewProj),e.set(this.lvp,F.lightVP),e.set([this.cam.eye[0],this.cam.eye[1],this.cam.eye[2],this.time],F.camPos),e.set([this.W,this.H,1/this.W,1/this.H],F.res),e.set([t.meta.qmin[0],t.meta.qmin[1],t.meta.qmin[2],t.meta.unitCm],F.qmin),e.set([t.meta.qext[0],t.meta.qext[1],t.meta.qext[2],0],F.qext),e.set([n.absorb[0],n.absorb[1],n.absorb[2],1.36],F.absorb),e.set(n.back,F.backCol),e.set(n.finTip,F.finTipCol),e.set(n.belly,F.bellyCol),e.set(n.glow,F.glowCol),e.set([n.floor[0],n.floor[1],n.floor[2],1],F.studio),e.set([this.beads.count,this.grab.twist,.05,40],F.misc),e.set(n.bead,F.beadCol),e.set(this.beads.pos.subarray(0,64),F.beads);let r=H,i=Math.hypot(r[0],r[1],r[2]);e.set([r[0]/i,r[1]/i,r[2]/i,0],F.lightDir),e.set([n.bgTop[0],n.bgTop[1],n.bgTop[2],1],F.bgTop),e.set([n.bgBot[0],n.bgBot[1],n.bgBot[2],1],F.bgBot)}landmark(e,t,n){let r=this.path.asset,i=r.meta.landmarks.indexOf(e),a=0,o=0,s=0;for(let e=0;e<4;e++){let c=r.s.lmN[4*i+e],l=r.s.lmW[4*i+e];a+=t[c*n]*l,o+=t[c*n+1]*l,s+=t[c*n+2]*l}return[a,o,s]}updateReadouts(e){if(this.roT+=e,this.roT<.1)return;this.roT=0;let t=this.path.nodes();if(!t)return;let n=this.path.asset,{data:r,stride:i}=t,a=n.tets,o=0;for(let e=0;e<a.length;e+=4){let t=a[e]*i,n=a[e+1]*i,s=a[e+2]*i,c=a[e+3]*i,l=r[n]-r[t],u=r[n+1]-r[t+1],d=r[n+2]-r[t+2],f=r[s]-r[t],p=r[s+1]-r[t+1],m=r[s+2]-r[t+2],h=r[c]-r[t],g=r[c+1]-r[t+1],_=r[c+2]-r[t+2];o+=(l*(p*_-m*g)-u*(f*_-m*h)+d*(f*g-p*h))/6}let s=n.meta.unitCm,c=o*this.volRatio*s*s*s,l=this.landmark(`snout`,r,i),u=this.landmark(`fork`,r,i),d=this.landmark(`eyeL`,r,i),f=this.landmark(`eyeR`,r,i);this.readouts={volumeMl:c,massG:c*1.04,forkCm:Math.hypot(l[0]-u[0],l[1]-u[1],l[2]-u[2])*s,eyeCm:Math.hypot(d[0]-f[0],d[1]-f[1],d[2]-f[2])*s},this.onReadouts?.(this.readouts)}ray(e,t){let n=this.canvas.getBoundingClientRect(),r=(e-n.left)/n.width*2-1,i=-((t-n.top)/n.height*2-1),a=this.zeroToOne?0:-1,o=P.transformPoint(this.ivp,r,i,a),s=P.transformPoint(this.ivp,r,i,1),c=[o[0]/o[3],o[1]/o[3],o[2]/o[3]],l=[s[0]/s[3],s[1]/s[3],s[2]/s[3]],u=[l[0]-c[0],l[1]-c[1],l[2]-c[2]],d=Math.hypot(u[0],u[1],u[2]);return{ro:c,rd:[u[0]/d,u[1]/d,u[2]/d]}}pick(e,t){let n=this.path.nodes();if(!n)return null;let{ro:r,rd:i}=this.ray(e,t),{data:a,stride:o}=n,s=this.path.asset.nodes.length/3,c=this.path.asset.meta.h*.9+.006,l=-1,u=1e9;for(let e=0;e<s;e++){let t=e*o,n=a[t]-r[0],s=a[t+1]-r[1],d=a[t+2]-r[2],f=n*i[0]+s*i[1]+d*i[2];if(f<=0)continue;let p=n-i[0]*f,m=s-i[1]*f,h=d-i[2]*f,g=Math.hypot(p,m,h);g<c&&f-(c-g)<u&&(u=f-(c-g)*.5,l=e)}if(l<0)return null;let d=l*o;return{node:l,p:[a[d],a[d+1],a[d+2]]}}startGrab(e,t,n){let{data:r,stride:i}=this.path.nodes(),a=this.path.asset.nodes.length/3,o=[];for(let e=0;e<a;e++){let a=e*i,s=Math.hypot(r[a]-t[0],r[a+1]-t[1],r[a+2]-t[2]);s<n&&o.push([s,e])}o.sort((e,t)=>e[0]-t[0]);let s=this.grab;s.count=Math.min(o.length,64);for(let e=0;e<s.count;e++){let[a,c]=o[e],l=c*i;s.idx[e]=c,s.wt[e]=(1-a/n)**1.5,s.off[3*e]=r[l]-t[0],s.off[3*e+1]=r[l+1]-t[1],s.off[3*e+2]=r[l+2]-t[2]}s.target.set(t),s.twist=0;let c=[this.cam.eye[0]-t[0],this.cam.eye[1]-t[1],this.cam.eye[2]-t[2]],l=Math.hypot(c[0],c[1],c[2]);this.grabPlane={p:[...t],n:[c[0]/l,c[1]/l,c[2]/l]},s.axis.set(this.grabPlane.n),s.active=!0}moveGrab(e,t){let{ro:n,rd:r}=this.ray(e,t),{p:i,n:a}=this.grabPlane,o=r[0]*a[0]+r[1]*a[1]+r[2]*a[2];if(Math.abs(o)<1e-5)return;let s=((i[0]-n[0])*a[0]+(i[1]-n[1])*a[1]+(i[2]-n[2])*a[2])/o,c=n[0]+r[0]*s,l=n[1]+r[1]*s,u=n[2]+r[2]*s,d=c-i[0],f=l-i[1],p=u-i[2],m=Math.hypot(d,f,p),h=.32;if(m>h){let e=h/m;c=i[0]+d*e,l=i[1]+f*e,u=i[2]+p*e}this.grab.target.set([c,Math.max(l,.005),u])}firstInteract(){this.interacted||(this.interacted=!0,this.onFirstInteract?.())}bindInput(){let e=this.canvas;e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`pointerdown`,t=>{if(e.setPointerCapture(t.pointerId),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this.firstInteract(),this.pointers.size===1){let e=this.pick(t.clientX,t.clientY);e?(this.mode=`grab`,this.startGrab(e.node,e.p,.075)):(this.mode=`orbit`,this.orbitStart={x:t.clientX,y:t.clientY,yaw:this.camGoal.yaw,pitch:this.camGoal.pitch})}else if(this.pointers.size===2){let[e,t]=[...this.pointers.values()];this.mode===`grab`?(this.mode=`twist`,this.twistStart=Math.atan2(t.y-e.y,t.x-e.x),this.twistBase=this.grab.twist):(this.mode=`pinch`,this.pinchStart=Math.hypot(t.x-e.x,t.y-e.y),this.zoomStart=this.camGoal.zoom,this.twistStart=Math.atan2(t.y-e.y,t.x-e.x),this.orbitStart.yaw=this.camGoal.yaw)}}),e.addEventListener(`pointermove`,e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});let t=[...this.pointers.values()];if(this.mode===`grab`)this.moveGrab(e.clientX,e.clientY);else if(this.mode===`orbit`){let t=this.orbitStart;this.camGoal.yaw=t.yaw-(e.clientX-t.x)*.006,this.camGoal.pitch=Math.min(1.25,Math.max(.08,t.pitch+(e.clientY-t.y)*.004))}else if(this.mode===`twist`&&t.length>=2){let e=Math.atan2(t[1].y-t[0].y,t[1].x-t[0].x)-this.twistStart;for(;e>Math.PI;)e-=2*Math.PI;for(;e<-Math.PI;)e+=2*Math.PI;this.grab.twist=Math.max(-2.2,Math.min(2.2,this.twistBase-e)),this.moveGrab(t[0].x,t[0].y)}else if(this.mode===`pinch`&&t.length>=2){let e=Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y);this.camGoal.zoom=Math.min(1.6,Math.max(.45,this.zoomStart*this.pinchStart/Math.max(e,1)))}});let t=e=>{this.pointers.delete(e.pointerId),this.pointers.size===0?(this.mode=`none`,this.grab.active=!1,this.grab.twist=0):this.mode===`twist`?this.mode=`grab`:this.mode===`pinch`&&(this.mode=`none`)};e.addEventListener(`pointerup`,t),e.addEventListener(`pointercancel`,t),e.addEventListener(`wheel`,e=>{e.preventDefault(),this.firstInteract();let t=e.deltaMode===1?e.deltaY*16:e.deltaY;if(this.mode===`grab`||this.mode===`twist`)this.grab.twist=Math.max(-2.2,Math.min(2.2,this.grab.twist+t*.004));else{if(!this.grab.active){let n=this.pick(e.clientX,e.clientY);if(!n){this.camGoal.zoom=Math.min(1.6,Math.max(.45,this.camGoal.zoom*Math.exp(t*.001)));return}this.startGrab(n.node,n.p,.11)}this.grab.twist=Math.max(-2.2,Math.min(2.2,this.grab.twist+t*.004)),this.wheelTimer=.7}},{passive:!1})}}})),U,W,Te,G,Ee,De,K,q,Oe,ke,Ae,je,Me,Ne,Pe,Fe,Ie=e((()=>{I(),le(),U=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
${pe}
`,W=`
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
`,Te=`
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
`,G=U+Te+`
uniform int uLight; // 1 = render from light
out vec3 vP; out vec3 vN; out vec3 vX; out vec3 vNr; out vec4 vA;
void main(){
  vec3 X = fr.qmin.xyz + aPos.xyz * fr.qext.xyz;
  vec3 Nr = normalize(aNrm.xyz);
  vec4 w = max(aW * 2.0, vec4(0.0)); w /= max(dot(w, vec4(1.0)), 1e-4);
  vec3 P, N; skin(X, Nr, aNodes, w, P, N);
  vP = P; vN = N; vX = X; vNr = Nr; vA = aAttr;
  gl_Position = (uLight == 1 ? fr.lightVP : fr.viewProj) * vec4(P, 1.0);
}`,Ee=U+W+`
uniform int uLayer;
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){
  float d = -dot(vP, lightKey());
  float s = gl_FrontFacing ? -d : d;
  o = uLayer == 0 ? vec4(s, 0.0, 0.0, vP.y) : vec4(0.0, s, 0.0, vP.y);
}`,De=U+W+`
in vec3 vP; in vec3 vN; in vec3 vX; in vec3 vNr; in vec4 vA;
out vec4 o;
void main(){ o = vec4(linDepth(vP), 0.0, 0.0, 1.0); }`,K=`#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`,q=`
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
}`,Oe=U+W+q+`
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
}`,ke=U+W+q+N+ce+`
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
}`,Ae=U+`
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
}`,je=U+W+`
in vec2 vQ; in vec3 vC; in float vR; out vec4 o;
void main(){
  float r2 = dot(vQ, vQ); if (r2 > 1.0) discard;
  float z = sqrt(1.0 - r2);
  float rim = pow(1.0 - z, 2.2);
  float spec = pow(sat(1.0 - length(vQ - vec2(-0.38, 0.42)) * 2.6), 3.0);
  float a = sat(rim * 0.95 + spec + 0.06);
  vec3 c = vec3(1.0) * (rim * 1.2 + spec * 2.5) + fr.glowCol.rgb * 0.05;
  o = vec4(c * a, a);
}`,Me=U+`
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
}`,Ne=U+W+`
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
}`,Pe=U+W+N+`
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
  vec3 sig = fr.absorb.rgb * (1.0 + back * 0.9 + tip * 2.5) + vec3(slit * 30.0 + groove * 6.0);
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
  filt *= 1.0 - 0.5 * slit;
  col *= filt;
  // back-lit glow in the thin parts
  float thin = exp(-thick0 / 0.035);
  vec3 L = lightKey(); vec3 Lr = lightRim();
  float through = pow(sat(dot(-N, Lr) * 0.6 + 0.4), 1.5) * 1.1 + pow(sat(dot(-V, L) * 0.5 + 0.5), 2.0) * 0.4;
  vec3 glow = fr.glowCol.rgb * filt * thin * through * (1.0 - Tsum * 0.5) * 0.85;
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
}`,Fe=`#version 300 es
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
}`}));function J(e,t,n,r){let i=(t,n)=>{let i=e.createShader(t);if(e.shaderSource(i,n),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){let a=e.getShaderInfoLog(i),o=n.split(`
`).map((e,t)=>`${t+1}: ${e}`).join(`
`);throw console.warn(o),Error(`${r} ${t===e.VERTEX_SHADER?`VS`:`FS`}: ${a}`)}return i},a=e.createProgram();if(e.attachShader(a,i(e.VERTEX_SHADER,t)),e.attachShader(a,i(e.FRAGMENT_SHADER,n)),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw Error(r+` link: `+e.getProgramInfoLog(a));let o=e.getUniformBlockIndex(a,`Frame`);return o!==e.INVALID_INDEX&&e.uniformBlockBinding(a,o,0),a}var Le,Re=e((()=>{Ie(),I(),V(),Le=class{constructor(e,t,n){B(this,`canvas`,void 0),B(this,`asset`,void 0),B(this,`kind`,`webgl2`),B(this,`gl`,void 0),B(this,`progs`,{}),B(this,`ubo`,void 0),B(this,`nodeTex`,void 0),B(this,`restTex`,void 0),B(this,`nodeRows`,1),B(this,`vaoOuter`,void 0),B(this,`vaoInner`,void 0),B(this,`vaoBub`,void 0),B(this,`vaoEmpty`,void 0),B(this,`nOuter`,0),B(this,`nInner`,0),B(this,`nBub`,0),B(this,`idxType`,0),B(this,`shadow`,void 0),B(this,`scene`,void 0),B(this,`back`,void 0),B(this,`shell`,void 0),B(this,`W`,1),B(this,`H`,1),B(this,`samples`,4),B(this,`halfFloat`,!0),B(this,`nodeStage`,void 0),this.canvas=e,this.asset=t;let r=e.getContext(`webgl2`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,powerPreference:`high-performance`});if(!r)throw Error(`WebGL2 unavailable`);this.gl=r,r.getExtension(`EXT_color_buffer_float`)||r.getExtension(`EXT_color_buffer_half_float`)||(this.halfFloat=!1),r.getExtension(`OES_texture_float_linear`),this.samples=Math.min(n.msaa,r.getParameter(r.MAX_SAMPLES)),this.init()}init(){let e=this.gl,t=this.asset,n=this.progs;n.shadow=J(e,G,Ee,`shadow`),n.back=J(e,G,De,`back`),n.inner=J(e,G,ke,`inner`),n.shell=J(e,G,Pe,`shell`),n.backdrop=J(e,K,Oe,`backdrop`),n.bubble=J(e,Ae,je,`bubble`),n.bead=J(e,Me,Ne,`bead`),n.composite=J(e,K,Fe,`composite`),this.ubo=e.createBuffer(),e.bindBuffer(e.UNIFORM_BUFFER,this.ubo),e.bufferData(e.UNIFORM_BUFFER,832,e.DYNAMIC_DRAW),e.bindBufferBase(e.UNIFORM_BUFFER,0,this.ubo);let r=t.nodes.length/3;this.nodeRows=Math.ceil(r*4/1024),this.nodeTex=this.floatTex(1024,this.nodeRows);let i=Math.ceil(r/1024);this.restTex=this.floatTex(1024,i);let a=new Float32Array(1024*i*4);for(let e=0;e<r;e++)a.set([t.nodes[3*e],t.nodes[3*e+1],t.nodes[3*e+2],1],4*e);e.bindTexture(e.TEXTURE_2D,this.restTex),e.texSubImage2D(e.TEXTURE_2D,0,0,0,1024,i,e.RGBA,e.FLOAT,a);let o=t.s,s=t=>{let n=e.createVertexArray();e.bindVertexArray(n);let r=(t,n,r,i,a,o=!1)=>{let s=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),e.enableVertexAttribArray(n),o?e.vertexAttribIPointer(n,r,i,0,0):e.vertexAttribPointer(n,r,i,a,0,0)};r(o[t+`pos`],0,4,e.UNSIGNED_SHORT,!0),r(o[t+`nrm`],1,4,e.SHORT,!0),r(o[t+`attr`],2,4,e.UNSIGNED_BYTE,!0),r(o[t+`nodes`],3,4,e.UNSIGNED_SHORT,!1,!0),r(o[t+`wts`],4,4,e.SHORT,!0);let i=e.createBuffer();return e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,i),e.bufferData(e.ELEMENT_ARRAY_BUFFER,o[t+`idx`],e.STATIC_DRAW),e.bindVertexArray(null),n};this.vaoOuter=s(`o_`),this.nOuter=o.o_idx.length,this.vaoInner=s(`i_`),this.nInner=o.i_idx.length,this.vaoBub=e.createVertexArray(),e.bindVertexArray(this.vaoBub);let c=(t,n,r,i,a)=>{let o=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),e.enableVertexAttribArray(n),a?e.vertexAttribIPointer(n,r,i,0,0):e.vertexAttribPointer(n,r,i,!1,0,0),e.vertexAttribDivisor(n,1)};c(o.bub,0,4,e.FLOAT,!1),c(o.bubN,1,4,e.UNSIGNED_SHORT,!0),c(o.bubW,2,4,e.FLOAT,!1),this.nBub=o.bub.length/4,e.bindVertexArray(null),this.vaoEmpty=e.createVertexArray(),this.shadow=this.makeTarget(512,512,0,!1),this.uploadNodes(this.restNodeData())}restNodeData(){let e=this.asset,t=e.nodes.length/3,n=new Float32Array(t*16);for(let r=0;r<t;r++)n.set([e.nodes[3*r],e.nodes[3*r+1],e.nodes[3*r+2],1,1,0,0,0,0,1,0,0,0,0,1,0],16*r);return n}floatTex(e,t){let n=this.gl,r=n.createTexture();return n.bindTexture(n.TEXTURE_2D,r),n.texStorage2D(n.TEXTURE_2D,1,n.RGBA32F,e,t),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),r}uploadNodes(e){let t=this.gl,n=1024*this.nodeRows*4;this.nodeStage&&this.nodeStage.length===n||(this.nodeStage=new Float32Array(n)),this.nodeStage.set(e),t.bindTexture(t.TEXTURE_2D,this.nodeTex),t.texSubImage2D(t.TEXTURE_2D,0,0,0,1024,this.nodeRows,t.RGBA,t.FLOAT,this.nodeStage)}makeTarget(e,t,n,r,i=!1){let a=this.gl,o=this.halfFloat?a.RGBA16F:a.RGBA8,s=a.createTexture();a.bindTexture(a.TEXTURE_2D,s),a.texStorage2D(a.TEXTURE_2D,1,o,e,t);let c=i?a.NEAREST:a.LINEAR;a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,c),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,c),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE);let l=a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,l),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,s,0);let u=[],d;if(n>1){d=a.createFramebuffer(),a.bindFramebuffer(a.FRAMEBUFFER,d);let i=a.createRenderbuffer();if(a.bindRenderbuffer(a.RENDERBUFFER,i),a.renderbufferStorageMultisample(a.RENDERBUFFER,n,o,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.RENDERBUFFER,i),u.push(i),r){let r=a.createRenderbuffer();a.bindRenderbuffer(a.RENDERBUFFER,r),a.renderbufferStorageMultisample(a.RENDERBUFFER,n,a.DEPTH_COMPONENT24,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.RENDERBUFFER,r),u.push(r)}}else if(r){let n=a.createRenderbuffer();a.bindRenderbuffer(a.RENDERBUFFER,n),a.renderbufferStorage(a.RENDERBUFFER,a.DEPTH_COMPONENT24,e,t),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.RENDERBUFFER,n),u.push(n)}let f=a.checkFramebufferStatus(a.FRAMEBUFFER);if(f!==a.FRAMEBUFFER_COMPLETE)throw Error(`FBO incomplete `+f);return a.bindFramebuffer(a.FRAMEBUFFER,null),{fbo:l,tex:s,msFbo:d,rbs:u,w:e,h:t}}freeTarget(e){if(!e)return;let t=this.gl;t.deleteFramebuffer(e.fbo),t.deleteTexture(e.tex),e.msFbo&&t.deleteFramebuffer(e.msFbo),e.rbs.forEach(e=>t.deleteRenderbuffer(e))}resize(e,t){e===this.W&&t===this.H&&this.scene||(this.W=e,this.H=t,this.canvas.width=e,this.canvas.height=t,this.freeTarget(this.scene),this.freeTarget(this.back),this.freeTarget(this.shell),this.scene=this.makeTarget(e,t,this.samples,!0),this.back=this.makeTarget(e,t,0,!0,!0),this.shell=this.makeTarget(e,t,this.samples,!0))}bindTex(e,t,n,r){let i=this.gl;i.activeTexture(i.TEXTURE0+n),i.bindTexture(i.TEXTURE_2D,r),i.uniform1i(i.getUniformLocation(e,t),n)}drawMesh(e,t,n){let r=this.gl;this.bindTex(e,`uNodes`,0,this.nodeTex),this.bindTex(e,`uRest`,1,this.restTex),r.bindVertexArray(t),r.drawElements(r.TRIANGLES,n,r.UNSIGNED_INT,0)}resolve(e){if(!e.msFbo)return;let t=this.gl;t.bindFramebuffer(t.READ_FRAMEBUFFER,e.msFbo),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,e.fbo),t.blitFramebuffer(0,0,e.w,e.h,0,0,e.w,e.h,t.COLOR_BUFFER_BIT,t.NEAREST),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null)}render(e){let t=this.gl,n=this.progs;e.nodeData&&this.uploadNodes(e.nodeData),t.bindBuffer(t.UNIFORM_BUFFER,this.ubo),t.bufferSubData(t.UNIFORM_BUFFER,0,e.frame),t.bindFramebuffer(t.FRAMEBUFFER,this.shadow.fbo),t.viewport(0,0,512,512),t.clearColor(0,0,0,10),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.DEPTH_TEST),t.disable(t.CULL_FACE),t.enable(t.BLEND),t.blendEquationSeparate(t.FUNC_ADD,t.MIN),t.blendFunc(t.ONE,t.ONE),t.useProgram(n.shadow),t.uniform1i(t.getUniformLocation(n.shadow,`uLight`),1),t.uniform1i(t.getUniformLocation(n.shadow,`uLayer`),0),this.drawMesh(n.shadow,this.vaoOuter,this.nOuter),t.uniform1i(t.getUniformLocation(n.shadow,`uLayer`),1),this.drawMesh(n.shadow,this.vaoInner,this.nInner),t.blendEquation(t.FUNC_ADD),t.disable(t.BLEND);let r=this.scene;t.bindFramebuffer(t.FRAMEBUFFER,r.msFbo??r.fbo),t.viewport(0,0,r.w,r.h),t.clearColor(0,0,0,1e3),t.clearDepth(1),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.useProgram(n.backdrop),this.bindTex(n.backdrop,`uShadow`,2,this.shadow.tex),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,3),t.enable(t.DEPTH_TEST),t.depthFunc(t.LESS),t.enable(t.CULL_FACE),t.cullFace(t.BACK),t.useProgram(n.inner),t.uniform1i(t.getUniformLocation(n.inner,`uLight`),0),this.bindTex(n.inner,`uShadow`,2,this.shadow.tex),this.drawMesh(n.inner,this.vaoInner,this.nInner),t.disable(t.CULL_FACE),t.useProgram(n.bead),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,96),t.enable(t.BLEND),t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ZERO,t.ONE),t.depthMask(!1),t.useProgram(n.bubble),this.bindTex(n.bubble,`uNodes`,0,this.nodeTex),t.bindVertexArray(this.vaoBub),t.drawArraysInstanced(t.TRIANGLE_STRIP,0,4,this.nBub),t.disable(t.BLEND),t.depthMask(!0),this.resolve(r);let i=this.back;t.bindFramebuffer(t.FRAMEBUFFER,i.fbo),t.viewport(0,0,i.w,i.h),t.clearColor(1e3,0,0,1),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.enable(t.CULL_FACE),t.cullFace(t.FRONT),t.useProgram(n.back),t.uniform1i(t.getUniformLocation(n.back,`uLight`),0),this.drawMesh(n.back,this.vaoOuter,this.nOuter);let a=this.shell;t.bindFramebuffer(t.FRAMEBUFFER,a.msFbo??a.fbo),t.viewport(0,0,a.w,a.h),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.cullFace(t.BACK),t.useProgram(n.shell),t.uniform1i(t.getUniformLocation(n.shell,`uLight`),0),this.bindTex(n.shell,`uScene`,2,r.tex),this.bindTex(n.shell,`uBack`,3,i.tex),this.drawMesh(n.shell,this.vaoOuter,this.nOuter),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),this.resolve(a),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.W,this.H),t.useProgram(n.composite),this.bindTex(n.composite,`uScene`,0,r.tex),this.bindTex(n.composite,`uShell`,1,a.tex),t.uniform4f(t.getUniformLocation(n.composite,`uParams`),e.exposure,e.time,1.5/255,.35),t.bindVertexArray(this.vaoEmpty),t.drawArrays(t.TRIANGLES,0,3)}}})),ze,Be=e((()=>{Re(),V(),ze=class{constructor(e,t,n,r,i){B(this,`asset`,void 0),B(this,`kind`,`webgl2`),B(this,`gl`,void 0),B(this,`worker`,void 0),B(this,`latest`,null),B(this,`fresh`,null),B(this,`inflight`,0),B(this,`cost`,0),B(this,`seq`,0),B(this,`substeps`,8),B(this,`ready`,void 0),this.asset=t,this.gl=new Le(e,t,{msaa:i}),this.worker=new Worker(new URL(new URL(`worker-CcHHwTR6.js`,import.meta.url).href,``+import.meta.url),{type:`module`}),this.ready=new Promise((e,t)=>{this.worker.onmessage=t=>{let n=t.data;n.type===`ready`?e():n.type===`state`&&(this.inflight--,this.cost=this.cost*.9+n.cost*.1,this.fresh=n.nodeData,this.latest=n.nodeData)},this.worker.onerror=e=>t(e)}),this.worker.postMessage({type:`init`,buf:n.slice(0),character:r,substeps:this.substeps})}step(e){if(this.inflight>1)return;this.cost>13&&this.substeps>6?this.substeps--:this.cost<7&&this.substeps<10&&this.substeps++;let t=e.grab;this.worker.postMessage({type:`step`,dt:e.dt,act:e.act,substeps:this.substeps,seq:this.seq++,grab:{active:t.active,count:t.count,idx:t.idx,off:t.off,wt:t.wt,target:t.target,twist:t.twist,axis:t.axis},beads:e.beads,beadCount:e.beadCount}),this.inflight++}render(e,t,n){let r=this.fresh;this.fresh=null,this.gl.render({frame:e,nodeData:r,exposure:t,time:n})}resize(e,t){this.gl.resize(e,t)}nodes(){return this.latest?{data:this.latest,stride:16}:null}reset(){this.worker.postMessage({type:`reset`})}simMs(){return this.cost}}}));function Y(e){Z(`bar`).style.width=`${Math.round(e*100)}%`,Z(`pct`).textContent=`${Math.round(e*100)}%`}function Ve(){Z(`loader`).classList.add(`done`)}function He(){Z(`fail`).hidden=!1,Z(`loader`).classList.add(`done`)}function Ue(e,t){let n=document.querySelector(`.colourways`);n.innerHTML=``,e.forEach((e,r)=>{let i=document.createElement(`button`);i.className=`cw`+(r===0?` active`:``),i.setAttribute(`role`,`radio`),i.setAttribute(`aria-checked`,r===0?`true`:`false`),i.dataset.id=e.id,i.innerHTML=`<span class="dot" style="background:${e.swatch}"></span><span class="en">${e.label}</span><span class="zh">${e.zh}</span>`,i.addEventListener(`click`,()=>{n.querySelectorAll(`.cw`).forEach(e=>{e.classList.remove(`active`),e.setAttribute(`aria-checked`,`false`)}),i.classList.add(`active`),i.setAttribute(`aria-checked`,`true`),t(e)}),n.appendChild(i)})}function We(e){$||($={...e});let t=.45;$.massG+=(e.massG-$.massG)*t,$.volumeMl+=(e.volumeMl-$.volumeMl)*t,$.forkCm+=(e.forkCm-$.forkCm)*t,$.eyeCm+=(e.eyeCm-$.eyeCm)*t,Z(`ro-mass`).textContent=Q($.massG,1),Z(`ro-vol`).textContent=Q($.volumeMl,1),Z(`ro-fork`).textContent=Q($.forkCm,2),Z(`ro-eye`).textContent=Q($.eyeCm,2)}function X(){Z(`hint`).classList.add(`gone`)}function Ge(e){Z(`colophon`).textContent=e}var Z,Q,$,Ke=e((()=>{Z=e=>document.getElementById(e),Q=(e,t)=>e.toFixed(t),$=null})),qe,Je,Ye,Xe,Ze,Qe,$e=e((()=>{qe=`modulepreload`,Je=function(e,t){return new URL(e,t).href},Ye={},Xe=function(e){return e.pathname.endsWith(`.css`)},Ze=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},Qe=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=Je(t,n);let r=s(t),i=Xe(r);return Ze(Ye,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:qe,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})}}));t((()=>{n(),s(),de(),we(),Be(),Ke(),$e();var e=new URLSearchParams(location.search),t=matchMedia(`(pointer: coarse)`).matches||/Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent);async function r(e,t){let n=await fetch(e);if(!n.ok||!n.body)throw Error(`asset ${e}: ${n.status}`);let r=+(n.headers.get(`content-length`)||0),i=n.body.getReader(),a=[],o=0;for(;;){let{done:e,value:n}=await i.read();if(e)break;a.push(n),o+=n.length,r&&t(o/r)}let s=new Uint8Array(o),c=0;for(let e of a)s.set(e,c),c+=e.length;return s.buffer}async function i(){if(e.get(`backend`)===`webgl2`||!(`gpu`in navigator))return null;try{let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});return e?{adapter:e,device:await e.requestDevice({requiredLimits:{maxStorageBuffersPerShaderStage:Math.min(8,e.limits.maxStorageBuffersPerShaderStage)}})}:null}catch(e){return console.info(`WebGPU unavailable:`,e),null}}async function a(){let n=document.getElementById(`gl`),a=ue[0];Y(.05);let s=await i(),c=null,l=``,u=+(e.get(`dpr`)||2);if(s){l=e.get(`q`)||(t?`md`:`hi`);try{let e=o(await r(`./assets/${a.id}/${l}.bin`,e=>Y(.05+e*.85)),a.actuation,1),{GPUPath:t}=await Qe(async()=>{let{GPUPath:e}=await import(`./gpupath-DZpmVz2M.js`);return{GPUPath:e}},[],import.meta.url),i=new t(n,e,s.device,4);await i.ready,c=i}catch(e){console.warn(`WebGPU path failed, falling back to WebGL2:`,e),c=null}}if(!c){l=e.get(`q`)||`lo`;let i=await r(`./assets/${a.id}/${l}.bin`,e=>Y(.05+e*.85)),s=o(i,a.actuation,1),u=new ze(n,s,i,a.id,t?0:4);await u.ready,c=u}Y(1);let d=c.kind===`webgpu`,f=new Ce(n,c,a.actuation,a.colourways,u,d);window.__jelly=f,t&&innerWidth<innerHeight&&(f.camGoal.yaw=f.cam.yaw=.95,f.camGoal.pitch=f.cam.pitch=.55);let p=e.get(`cam`);if(p){let[e,t,n]=p.split(`,`).map(Number);Object.assign(f.camGoal,{yaw:e,pitch:t,zoom:n??1}),Object.assign(f.cam,{yaw:e,pitch:t,zoom:n??1})}e.get(`tgt`)&&(f.cam.target=e.get(`tgt`).split(`,`).map(Number)),Ue(a.colourways,e=>f.setColour(e)),f.onReadouts=e=>We(e),f.onFirstInteract=()=>X();let m=c.asset;Ge(`${c.kind===`webgpu`?`WebGPU compute`:`WebGL 2 · CPU worker`} · ${m.meta.tets.toLocaleString(`en-US`)} tetrahedra · ${(m.meta.outer.tris+m.meta.inner.tris).toLocaleString(`en-US`)} triangles`);let h=()=>f.resize();addEventListener(`resize`,h),new ResizeObserver(h).observe(n),f.resize(),document.getElementById(`bait`).addEventListener(`click`,()=>{f.dropBait(),X()}),document.getElementById(`reset`).addEventListener(`click`,()=>f.reset()),document.addEventListener(`visibilitychange`,()=>{document.hidden?f.stop():f.start()}),f.start(),requestAnimationFrame(()=>requestAnimationFrame(()=>Ve())),window.__jellyReady={backend:c.kind,level:l,tets:m.meta.tets}}a().catch(e=>{console.error(e),He()})}))();export{V as n,e as r,B as t};