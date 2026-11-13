var e={viewProj:0,view:16,proj:32,invViewProj:48,lightVP:64,camPos:80,res:84,qmin:88,qext:92,absorb:96,backCol:100,finTipCol:104,bellyCol:108,glowCol:112,studio:116,misc:120,beadCol:124,beads:128,lightDir:192,bgTop:196,bgBot:200,extra:204},t=`
layout(std140) uniform Frame {
  mat4 viewProj; mat4 view; mat4 proj; mat4 invViewProj; mat4 lightVP;
  vec4 camPos; vec4 res; vec4 qmin; vec4 qext; vec4 absorb; vec4 backCol; vec4 finTipCol; vec4 bellyCol; vec4 glowCol;
  vec4 studio; vec4 misc; vec4 beadCol; vec4 beads[16]; vec4 lightDir; vec4 bgTop; vec4 bgBot; vec4 extra;
} fr;
`,n=`
struct Frame {
  viewProj: mat4x4f, view: mat4x4f, proj: mat4x4f, invViewProj: mat4x4f, lightVP: mat4x4f,
  camPos: vec4f, res: vec4f, qmin: vec4f, qext: vec4f, absorb: vec4f, backCol: vec4f, finTipCol: vec4f, bellyCol: vec4f, glowCol: vec4f,
  studio: vec4f, misc: vec4f, beadCol: vec4f, beads: array<vec4f, 16>, lightDir: vec4f, bgTop: vec4f, bgBot: vec4f, extra: vec4f,
};
`,r={gravity:39.2,density:1,muBody:90,muFin:2500,lambdaRatio:150,damping:1.2,substeps:10,frictionStatic:1.2,frictionKinetic:.9,grabStiffness:.12};export{n as i,e as n,t as r,r as t};