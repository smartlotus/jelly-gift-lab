import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
OFF={'flower':float(sys.argv[1]),'mushroom':float(sys.argv[2])}
def tiles_for(theme, cases_spec):
    T=json.load(open(f'woods-{theme}-desktop-telemetry.json')); off=OFF[theme]
    out=[]
    for label,cond,k in cases_spec:
        c=[s for s in T if cond(s) and s['t']>2]
        if not c: continue
        s=c[int((len(c)-1)*k)]
        vt=s['t']-off
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',f'{vt:.3f}','-i',f'woods-{theme}-desktop.mp4','-frames:v','1','/tmp/fl.png'],check=True)
        im=Image.open('/tmp/fl.png').convert('RGB'); sc=im.width/s['vw']
        cx=int(((s['pig']+s['cat'])/2-s['cam'])*sc); x0=max(0,min(im.width-420,cx-210))
        top=Image.new('RGB',(420,300),'black'); top.paste(im.crop((x0,250,x0+420,480)),(0,60))
        top.paste(im.crop((0,515,110,540)),(310,272))
        d=ImageDraw.Draw(top)
        d.text((4,2),f'{theme}: {label}',fill='white',font=font)
        d.text((4,20),f"telemetry T={s['t']:.2f}s pigVx={s['pigVx']} face={s['pigFace']} lane={s['lane']}",fill='white',font=font)
        d.text((4,38),f"cat vx={s['vx']} face={s['face']}  (stamp = this frame's clock)",fill='white',font=font)
        out.append(top)
    return out
spec=[('pig walks LEFT: face -1, sheet flipped', lambda s:s['pigVx']<-30 and s['pigFace']==-1 and s['lane']<0.05, 0.5),
      ('pig walks RIGHT: face +1, native sheet', lambda s:s['pigVx']>30 and s['pigFace']==1 and s['lane']<0.05, 0.5),
      ('cat LEFT, pig back lane heading right', lambda s:s['vx']<-20 and s['pigVx']>30 and s['lane']>0.9, 0.3)]
tiles=tiles_for('flower',spec)+tiles_for('mushroom',spec)
W=Image.new('RGB',(430*3,310*2),'white')
for i,t in enumerate(tiles): W.paste(t,((i%3)*430,(i//3)*310))
W.save(sys.argv[3],quality=88)
