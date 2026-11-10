import json, subprocess
from PIL import Image, ImageDraw, ImageFont
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
RW,RD=8.4,6.2
def overhead(s, half_table):
    W,H=420,330; im=Image.new('RGB',(W,H),(245,240,232)); d=ImageDraw.Draw(im)
    sc=44; ox,oy=W/2,H/2+10
    P=lambda x,z:(ox+x*sc, oy+z*sc)
    d.rectangle([P(-RW/2,-RD/2),P(RW/2,RD/2)],outline=(120,90,60),width=2)
    d.text((6,4),'overhead (x right, z toward camera), metres',fill=(60,60,60),font=F)
    col={'sofa':(200,170,120),'table':(140,100,60),'bed':(200,110,120)}
    for it in s['items']:
        a,b=P(it['min'][0],it['min'][2]),P(it['max'][0],it['max'][2])
        d.rectangle([a,b],fill=col.get(it['kind'],(150,150,150)),outline=(40,40,40))
        d.text((a[0]+2,a[1]+1),it['kind'],fill='black',font=F)
    ps=s['ps']
    if ps['ghost'] and ps['ghostKind']=='table':
        g=ps['ghostAt']; hx,hz=half_table
        d.rectangle([P(g['x']-hx,g['z']-hz),P(g['x']+hx,g['z']+hz)],outline=(230,170,20),width=3)
        d.text(P(g['x']-hx,g['z']+hz),'preview',fill=(180,120,0),font=F)
    if ps['blocked']:
        bz=ps['blockedAt']
        d.rectangle([P(bz['x']-bz['hw'],bz['z']-bz['hd']),P(bz['x']+bz['hw'],bz['z']+bz['hd'])],outline=(220,40,40),width=3)
        d.text(P(bz['x']-bz['hw'],bz['z']-bz['hd']-16),'red footprint (decal, not a mesh)',fill=(200,30,30),font=F)
    return im
def case(clip, tel, off, T, title, lines, half_table=(0.75,0.485)):
    tl=json.load(open(tel)); s=min(tl,key=lambda q:abs(q['t']-T))
    subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',f"{s['t']-off:.3f}",'-i',clip,'-frames:v','1','/tmp/a.png'],check=True)
    fr=Image.open('/tmp/a.png').convert('RGB')
    stamp=fr.crop((0,690,130,720)); fr=fr.crop((100,40,1180,560)).resize((640,308)); fr.paste(stamp,(0,278))
    ov=overhead(s,half_table)
    out=Image.new('RGB',(640+420,62+330),'white'); d=ImageDraw.Draw(out)
    d.rectangle([0,0,1060,60],fill=(30,30,30))
    d.text((6,4),title,fill='white',font=FB)
    d.text((6,24),lines[0] if lines else '',fill='white',font=F)
    d.text((6,42),f"telemetry T={s['t']:.2f}s  ghost={s['ps']['ghost']} blocked={s['ps']['blocked']}  tables={sum(1 for i in s['items'] if i['kind']=='table')}"+(f"  gap table-sofa={s.get('gapTableSofa')} m" if 'gapTableSofa' in s else '')+(f"  gap preview-sofa={s.get('gapGhostSofa')} m" if 'gapGhostSofa' in s else ''),fill=(220,220,220),font=F)
    out.paste(fr,(0,70)); out.paste(ov,(640,62))
    return out
import sys
cases=[
 ('before-fix/home-blocked-drop-bed.mp4','before-fix/home-telemetry.json',0.26,3.56,'1  BEFORE fix (fe69b7b): arming the table chip showed the preview at its stale spot ON the sofa',['GENUINE defect, ~0.25 s (10 frames, T 3.48-3.72): preview kept the position where the sofa had just been dropped.']),
 ('home-blocked-drop-bed.mp4','home-telemetry.json',0.69,3.56,'2  AFTER fix: preview appears only at a checked spot - here beside the sofa',['Valid preview (near-solid, warm tint) beside the sofa, 0.24 m clear in this frame; min over the clip 0.042 m.']),
 ('home-blocked-drop-bed.mp4','home-telemetry.json',0.69,4.0,'3  Armed table over the sofa: red floor footprint only, no table drawn',['blocked=true, ghost=false: the red rectangle is a floor decal, there is no second table mesh.']),
 ('home-blocked-drop-bed.mp4','home-telemetry.json',0.69,8.3,'4  Placed table pushed into the sofa: stops 4.2 cm away, red footprint where it cannot go',['The table never moved inside the sofa: min gap over every drag frame = 0.042 m. The red decal overlaps the sofa on the floor, by design.']),
 ('home-blocked-drop-bed.mp4','home-telemetry.json',0.69,14.0,'5  Bed vs sofa after orbit + zoom (real mesh bounds, metres)',['bed 2.15 x 1.76 (h 1.15 incl. headboard)  |  sofa 2.02 x 0.86 (h 0.88)  |  table 1.50 x 0.97 (h 0.97 incl. vase)']),
]
for i,(c,t,o,T,ti,l) in enumerate(cases):
    case(c,t,o,T,ti,l).save(f'home-annotated-{i+1}.jpg',quality=88)
