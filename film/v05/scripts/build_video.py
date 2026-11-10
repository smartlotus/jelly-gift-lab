import subprocess, json
C='/workspace/jelly-future-film-v05/clips/'
N='/workspace/jelly-future-film-v05/norm/'
# (clip, start, dur, xfade_in_from_previous)
EDL=[
 ('s0_establish_t1', 0.0, 9.5, 0),
 ('s1_garden_t1',    0.0, 8.5, 1.2),
 ('s1_door_t1',      0.0, 8.0, 1.0),
 ('s2_greet_t1',     0.0, 8.0, 1.0),
 ('s3_sofa_t2',      0.0,10.0, 1.5),
 ('s3_lap_t1',       0.0, 7.0, 1.0),
 ('s4_bed_t1',       0.0,10.0, 1.5),
 ('s4_window_t1',    0.0, 6.0, 1.0),
 ('s5_snowhouse_t1', 0.0, 6.0, 1.5),
 ('s5_snow_t1',      0.0, 3.4, 1.0),
 ('s5_snowside_t2',  0.0, 8.0, 0.042),
 ('s6_sunrise_t1',   0.0,15.0, 1.5),
 ('s6_sunrise_ext_t1',0.1,11.9,0.4),
]
for i,(c,s,d,x) in enumerate(EDL):
    out=f'{N}{i:02d}_{c}.mov'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(s),'-t',str(d),'-i',C+c+'.mp4','-map','0:v:0','-an',
      '-vf','crop=1920:1080:0:4,fps=24,setsar=1,format=yuv422p10le','-c:v','prores_ks','-profile:v','3',out],check=True)
# xfade chain
inputs=[]; fc=[]; t=0; prev='[0:v]'
offs=[]
cur_len=EDL[0][2]
for i,(c,s,d,x) in enumerate(EDL):
    inputs+=['-i',f'{N}{i:02d}_{c}.mov']
for i in range(1,len(EDL)):
    x=EDL[i][3]; off=cur_len-x
    offs.append((EDL[i][0],round(off,3)))
    fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={x}:offset={off:.3f}[v{i}]')
    prev=f'[v{i}]'; cur_len=off+EDL[i][2]
# grade: gentle warmth, slight contrast curve, fine grain, vignette
fc.append(f'{prev}eq=contrast=1.03:saturation=1.04,colorbalance=rs=0.015:bs=-0.015:rh=0.01:bh=-0.01,vignette=angle=0.35,noise=alls=3:allf=t,format=yuv422p10le[vout]')
cmd=['ffmpeg','-v','error','-y']+inputs+['-filter_complex',';'.join(fc),'-map','[vout]','-c:v','prores_ks','-profile:v','3','/workspace/jelly-future-film-v05/out/clean_notext.mov']
subprocess.run(cmd,check=True)
json.dump({'total':cur_len,'starts':[(EDL[0][0],0)]+offs},open('/workspace/jelly-future-film-v05/out/timeline.json','w'),indent=1)
print(cur_len, offs)
