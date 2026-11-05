import sys,glob
from PIL import Image
d,step,off,n,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),sys.argv[5]
fs=sorted(glob.glob(d+'/f*.jpg'))[off::step][:n]
ims=[]
for f in fs:
    im=Image.open(f).convert('RGB'); W,H=im.size
    im=im.crop((int(W*.12),int(H*.34),int(W*.88),int(H*.86))); ims.append(im.resize((im.width*260//im.width, im.height*260//im.width)))
w,h=ims[0].size; cols=6; rows=(len(ims)+cols-1)//cols
g=Image.new('RGB',(w*cols,h*rows))
for i,m in enumerate(ims): g.paste(m,((i%cols)*w,(i//cols)*h))
g.save(out,quality=82); print(g.size)
