#!/bin/bash
# usage: sheet.sh clip.mp4 -> frames/<name>_sheet.jpg  (12 frames tiled 4x3)
f=$1; n=$(basename $f .mp4); d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)
fps=$(python3 -c "print(12/$d)")
ffmpeg -v error -y -i $f -vf "fps=$fps,scale=480:-1,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='%{pts\:hms}':x=5:y=5:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.5,tile=4x3" -frames:v 1 /workspace/jelly-future-film-v05/frames/${n}_sheet.jpg
