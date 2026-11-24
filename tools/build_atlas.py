#!/usr/bin/env python3
"""Packs every PNG in ../../wz-src/icons (or the folder given as argv[1]) into WebP sprite sheets of 20x20 cells (96 px each).
Outputs: icons/atlas0.webp, atlas1.webp ... + icons/atlas.json (icon -> [sheet, col, row]) + icons/atlas.js (same JSON as window.WZ_ATLAS, loaded synchronously by the game).
Add a new logo: drop NAME.png in the source folder and run this script again. Empty cells stay transparent."""
import sys, os, re, json
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'wz-src', 'icons')
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
CELL, COLS, ROWS = 96, 20, 20
def key(n):
    m = re.match(r's(\d+)_(\d+)$', n)
    return (0, int(m.group(1)), int(m.group(2)), '') if m else (1, 0, 0, n)
names = sorted([f[:-4] for f in os.listdir(SRC) if f.endswith('.png')], key=key)
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith('atlas') or f.endswith('.png'): os.remove(os.path.join(OUT, f))
per = COLS * ROWS; sheets = []; icons = {}
for si in range(0, (len(names) + per - 1) // per):
    sh = Image.new('RGBA', (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    for i, n in enumerate(names[si * per:(si + 1) * per]):
        im = Image.open(os.path.join(SRC, n + '.png')).convert('RGBA')
        if im.size != (CELL, CELL): im = im.resize((CELL, CELL), Image.LANCZOS)
        sh.paste(im, ((i % COLS) * CELL, (i // COLS) * CELL)); icons[n] = [si, i % COLS, i // COLS]
    fn = 'icons/atlas%d.webp' % si; sh.save(os.path.join(OUT, '..', fn), 'WEBP', lossless=True, quality=100, method=6); sheets.append(fn)
data = {'version': 1, 'cell': CELL, 'cols': COLS, 'rows': ROWS, 'sheets': sheets, 'icons': icons}
open(os.path.join(OUT, 'atlas.json'), 'w').write(json.dumps(data, separators=(',', ':')))
open(os.path.join(OUT, 'atlas.js'), 'w').write('window.WZ_ATLAS=' + json.dumps(data, separators=(',', ':')) + ';\n')
print(len(names), 'icons ->', len(sheets), 'sheet(s)')
