import numpy as np, scipy.signal as ss, soundfile as sf
SR=48000; BPM=72; BEAT=60/BPM; BAR=4*BEAT
TOTAL=98.66
N=int((TOTAL+0.5)*SR)
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def mf(m): return 440*2**((m-69)/12)
NAMES={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def m(s): # 'E5'
    return 12*(int(s[-1])+1)+NAMES[s[0]]+(1 if '#' in s else 0)
def add(sig,t,pan=0.0,gain=1.0):
    i=int(t*SR); j=min(N,i+len(sig)); sig=sig[:j-i]*gain
    L[i:j]+=sig*np.cos((pan+1)*np.pi/4)*1.41; R[i:j]+=sig*np.sin((pan+1)*np.pi/4)*1.41
def piano(midi,dur,vel=0.6):
    f=mf(midi); T=min(dur+1.8,6.0); t=np.arange(int(T*SR))/SR
    B=0.0003; out=np.zeros_like(t)
    for k in range(1,12):
        fk=k*f*np.sqrt(1+B*k*k)
        if fk>16000: break
        a=(1/k**1.25)*(1.0 if k>1 else 1.2)*(0.6+0.4*vel)**(k*0.35)
        dec=np.exp(-t*(0.6+0.35*k)*(f/260)**0.35)
        out+=a*np.sin(2*np.pi*fk*t+rng.random()*6.28)*dec
    att=np.minimum(1,t/0.004)
    rel=np.where(t<dur,1,np.exp(-(t-dur)/0.35))
    ham=rng.standard_normal(len(t))*np.exp(-t/0.006)*0.05
    return (out*att*rel+ham*att)*vel*0.22
def bell(midi,vel=0.3):
    f=mf(midi); T=3.0; t=np.arange(int(T*SR))/SR
    out=np.sin(2*np.pi*f*t)*np.exp(-t/1.2)+0.35*np.sin(2*np.pi*f*4.0*t)*np.exp(-t/0.25)+0.15*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/0.4)
    return out*np.minimum(1,t/0.002)*vel*0.12
def strings(midis,t0,dur,vel):
    T=dur+2.0; t=np.arange(int(T*SR))/SR; out=np.zeros_like(t)
    env=np.minimum(1,t/1.3)*np.where(t<dur,1,np.exp(-(t-dur)/0.9))
    for mi in midis:
        f=mf(mi)
        for det in (-0.07,0.0,0.06):
            ff=f*2**(det/12); vib=1+0.0025*np.sin(2*np.pi*(5.1+det)*t+rng.random()*6)
            ph=2*np.pi*np.cumsum(ff*vib)/SR
            for k in range(1,9):
                if ff*k>9000: break
                out+=np.sin(k*ph+rng.random()*6)/k**1.6
    return out*env*vel*0.018
# chords: (name, midi list for pad, bass root)
CH={'C':[60,64,67],'G':[59,62,67],'Am':[57,60,64],'F':[57,60,65],'Em':[59,64,67],'Dm':[57,62,65],'Gsus':[60,62,67]}
ROOT={'C':36,'G':43,'Am':45,'F':41,'Em':40,'Dm':38,'Gsus':43}
bars=['C','Am','F','G', 'C',      # 0-4 intro
      'C','G','Am','F',           # 5-8 A
      'F','C','Dm','G',           # 9-12
      'Am','F','C','G',           # 13-16 night
      'C','G','Am','F',           # 17-20 snow
      'F','G','Em','Am',          # 21-24 sunrise
      'F','G','C','C']            # 25-28 resolve
mel={2:[('C5',2),('A4',2)],3:[('B4',2),('D5',2)],4:[('E5',3),('G4',1)],
 5:[('E5',1.5),('D5',.5),('C5',1),('G4',1)],6:[('D5',1.5),('C5',.5),('B4',1),('G4',1)],
 7:[('C5',1.5),('B4',.5),('A4',1),('E5',1)],8:[('A4',1),('C5',1),('F5',1.5),('E5',.5)],
 9:[('D5',2),('C5',1),('A4',1)],10:[('G4',2),('E5',1),('D5',1)],11:[('D5',1.5),('E5',.5),('F5',1),('A4',1)],12:[('B4',3),('G4',1)],
 13:[('A5',2),('E5',2)],14:[('F5',2),('C5',2)],15:[('G5',2),('E5',2)],16:[('D5',4)],
 17:[('E5',1.5),('D5',.5),('C5',1),('G4',1)],18:[('D5',1.5),('C5',.5),('B4',1),('G4',1)],
 19:[('C5',1.5),('B4',.5),('A4',1),('E5',1)],20:[('A4',1),('C5',1),('F5',1.5),('E5',.5)],
 21:[('A5',1.5),('G5',.5),('F5',1),('C5',1)],22:[('D5',1.5),('E5',.5),('G5',2)],
 23:[('G5',1.5),('F5',.5),('E5',1),('B4',1)],24:[('C5',1),('E5',1),('A5',2)],
 25:[('A5',1.5),('G5',.5),('F5',1),('A4',1)],26:[('B4',1),('D5',1),('G5',2)],27:[('E5',4)],28:[('C5',6)]}
mvel={**{b:0.42 for b in range(0,5)},**{b:0.55 for b in range(5,13)},**{b:0.40 for b in range(13,17)},**{b:0.6 for b in range(17,21)},**{b:0.72 for b in range(21,25)},**{b:0.55 for b in range(25,29)}}
svel={0:0,1:0,2:0.35,3:0.45,4:0.5}
for b in range(5,9): svel[b]=0.55
for b in range(9,13): svel[b]=0.8
for b in range(13,17): svel[b]=0.55
for b in range(17,21): svel[b]=0.8
for b in range(21,25): svel[b]=1.25
for b in range(25,28): svel[b]=0.95
svel[28]=0.8
for b,ch in enumerate(bars):
    t0=b*BAR; root=ROOT[ch]; tones=CH[ch]
    # left hand
    if b<5 or 13<=b<17:
        pat=[(0,root),(1,root+7),(2,tones[1]),(3,root+7)]
        for beat,n in pat: add(piano(n,BEAT*1.8,0.34 if b<5 else 0.3),t0+beat*BEAT,pan=-0.25)
    elif b==28:
        for n in [root-12,root,root+7,tones[1]+12]: add(piano(n,5.0,0.4),t0,pan=-0.2)
    else:
        seq=[root,root+7,root+12,tones[1]+12,root+12,root+7,tones[1]+12,root+19]
        v=0.36 if b<17 else (0.42 if b<21 else 0.46)
        for k,n in enumerate(seq): add(piano(n,BEAT*0.9,v*(1.0 if k%2==0 else 0.85)),t0+k*BEAT/2,pan=-0.25)
    # melody
    tt=t0
    for nm,d in mel.get(b,[]):
        add(piano(m(nm),d*BEAT,mvel[b]),tt+rng.normal(0,0.006),pan=0.2); tt+=d*BEAT
    # strings pad
    if svel.get(b,0)>0:
        dur=BAR if b<28 else 5.5
        add(strings([x-12 for x in tones]+[root],t0,dur,svel[b]),t0,pan=0.0)
    # bells in night section
    if 13<=b<17:
        for k,n in enumerate([tones[2]+12,tones[0]+24]):
            add(bell(n,0.5),t0+(k*2+1)*BEAT,pan=0.4 if k else -0.4)
# reverb
def ir(seed):
    r=np.random.default_rng(seed); T=3.2; t=np.arange(int(T*SR))/SR
    x=r.standard_normal(len(t))*np.exp(-t/0.9)
    b,a=ss.butter(1,6000/(SR/2)); return ss.lfilter(b,a,x)/40
wl=ss.fftconvolve(L,ir(1))[:N]; wr=ss.fftconvolve(R,ir(2))[:N]
outL=L*0.82+wl*0.55; outR=R*0.82+wr*0.55
t=np.arange(N)/SR
fade=np.ones(N); fade[t>TOTAL-4.5]=np.cos(np.clip((t[t>TOTAL-4.5]-(TOTAL-4.5))/4.5,0,1)*np.pi/2)**1.5
fin=np.ones(N); fin[t<1.0]=t[t<1.0]
outL*=fade*fin; outR*=fade*fin
st=np.stack([outL,outR],1)[:int(TOTAL*SR)]
st/=np.max(np.abs(st))*1.12
sf.write('/workspace/jelly-future-film-v05/audio/score_raw.wav',st,SR,subtype='PCM_24')
print('ok',st.shape[0]/SR)
