"""Render CSS sprite views for visual QA; source image pixels are untouched."""
import html, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'asset-manifest.json').read_text())
keys = []
for name in sys.argv[1:]:
    if name == 'edges':
        keys.extend(json.loads((ROOT / 'sprite-edge-review.json').read_text()))
    else:
        keys.extend(x['key'] for x in json.loads((ROOT / f'batch-{name}.json').read_text()) if not x.get('skipReason'))
cards = []
for key in keys:
    a = manifest['assets'].get(key)
    if not a:
        continue
    x, y, w, h = a.get('crop', [a['column'] / a['columns'], a['row'] / a['rows'], 1 / a['columns'], 1 / a['rows']])
    clip = ' '.join(f'{v}%' for v in a.get('clip', [0, 0, 0, 0]))
    position = f'{x / (1-w) * 100 if w != 1 else 0}% {y / (1-h) * 100 if h != 1 else 0}%'
    cards.append(f'<article><div class="art" style="background-image:url(http://127.0.0.1:8767{a["imagePath"]});background-size:{100/w}% {100/h}%;background-position:{position};clip-path:inset({clip})"></div>{html.escape(a["name"])}<br>{html.escape(key)}</article>')
(ROOT / 'crop-review.html').write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0;font:12px sans-serif;background:#faf9f5}main{display:grid;grid-template-columns:repeat(4,240px)}article{height:210px;text-align:center;border:1px solid #ddd;box-sizing:border-box}.art{width:152px;height:152px;margin:6px auto;background-repeat:no-repeat;background-color:#faf9f5;background-blend-mode:multiply}</style><main>' + ''.join(cards))
