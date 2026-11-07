#!/usr/bin/env python3
from PIL import Image
import sys
cols = int(sys.argv[1])
dest = sys.argv[2]
files = sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
cw, ch = max(i.size[0] for i in ims), max(i.size[1] for i in ims)
rows = (len(ims) + cols - 1) // cols
pad = 8
out = Image.new('RGB', (cols * cw + pad * (cols + 1), rows * ch + pad * (rows + 1)), (26, 24, 22))
for i, im in enumerate(ims):
    r, c = divmod(i, cols)
    x = pad + c * (cw + pad) + (cw - im.size[0]) // 2
    y = pad + r * (ch + pad) + (ch - im.size[1]) // 2
    out.paste(im, (x, y))
out.save(dest, quality=90)
print('wrote', dest)
