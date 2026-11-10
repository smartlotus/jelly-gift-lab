from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
def card(lines, W, H, size, cy, spacing=1.7, out='x.png', glow=(70,35,8), glow_a=120, track=0.06, cx=None):
    f=ImageFont.truetype(FONT,size,index=2)
    txt=Image.new('L',(W,H),0); d=ImageDraw.Draw(txt)
    lh=size*spacing; y0=cy-lh*(len(lines)-1)/2
    for i,l in enumerate(lines):
        # letter spacing
        widths=[d.textlength(ch,font=f) for ch in l]; tw=sum(widths)+size*track*(len(l)-1)
        x=((W if cx is None else 2*cx)-tw)/2; y=y0+i*lh
        for ch,w in zip(l,widths):
            d.text((x,y),ch,font=f,fill=255,anchor='lm'); x+=w+size*track
    sh=txt.filter(ImageFilter.GaussianBlur(size*0.45)).point(lambda v:min(255,int(v*glow_a/255*2.0)))
    sh2=txt.filter(ImageFilter.GaussianBlur(size*0.05)).point(lambda v:int(v*0.45))
    img=Image.new('RGBA',(W,H),(0,0,0,0))
    shadow=Image.new('RGBA',(W,H),glow+(0,)); shadow.putalpha(sh)
    img=Image.alpha_composite(img,shadow)
    s2=Image.new('RGBA',(W,H),glow+(0,)); s2.putalpha(sh2); img=Image.alpha_composite(img,s2)
    fg=Image.new('RGBA',(W,H),(255,246,230,0)); fg.putalpha(txt); img=Image.alpha_composite(img,fg)
    img.save(out)
O='/workspace/jelly-future-film-v05/text/'
L1=['也许有一天，也许会是第 2000 天，','我们已经拥有了一个自己的家。']
END=['我的小臭猫。']
card(L1,1920,1080,44,300,out=O+'open_16x9.png',cx=1420)
card(END,1920,1080,80,175,out=O+'end_16x9.png',track=0.1,glow=(95,45,8),glow_a=165)
# vertical 1080x1920 versions (text placed in the blurred band below/above the picture)
card(['也许有一天，','也许会是第 2000 天，','我们已经拥有了','一个自己的家。'],1080,1920,58,1500,spacing=1.75,out=O+'open_9x16.png')
card(END,1080,1920,92,1470,out=O+'end_9x16.png',track=0.1)
print('ok')
