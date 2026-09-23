"""Prepare exact-name photo matches; ambiguous search hits are excluded."""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'flower-reference-candidates.json').read_text())
excluded = {'圓葉', '天堂鳥', '棉花', '水晶花', '石蒜', '花竹', '蘭花', '青蘋果', '鬱金香', '龍膽'}
aliases = {'火龍果': '火龍果(艷果金絲桃)', '牛頭茄': '五指茄(牛頭茄)',
           '紅竹': '朱蕉(紅竹)', '葉蘭': '蜘蛛抱蛋(葉蘭)',
           '電信蘭葉': '蓬萊焦(電信蘭葉)', '高山羊齒': '高山羊齒(革葉蕨)',
           '黃椰心葉': '黃椰子(黃椰心葉)', 'OT帕雷諾': "百合 'OT帕雷諾'",
           '水晶香水': "百合 '水晶香水'"}
selected = []
for item in data:
    name = item['query']
    if name in excluded:
        continue
    target = aliases.get(name, name)
    candidates = [x for x in item['candidates'] if x['name'] == target or x['name'].startswith(target + ' ')]
    if not candidates:
        continue
    choice = next((x for x in candidates if x['name'] == target), candidates[0])
    key = 'flower-' + hashlib.sha256(name.encode()).hexdigest()[:10]
    selected.append({'key': key, 'name': name, 'referenceName': choice['name'],
                     'sourceUrl': choice['sourceUrl'], 'referenceUrl': choice['referenceUrl'],
                     'referencePath': str(ROOT / 'references' / (key + '.jpg'))})

def download(item):
    try:
        path = Path(item['referencePath'])
        if not path.exists():
            path.write_bytes(urllib.request.urlopen(item['referenceUrl'], timeout=30).read())
        return item
    except Exception as error:
        print(item['name'], str(error))
        return None

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    selected = [x for x in pool.map(download, selected) if x]
for offset in range(0, len(selected), 16):
    batch = selected[offset:offset+16]
    name = 'flower-' + str(offset // 16 + 1)
    (ROOT / ('batch-' + name + '.json')).write_text(json.dumps(batch, ensure_ascii=False, indent=2))
    cells = ''.join('<article><img src="references/' + Path(x['referencePath']).name + '"><p>' +
                    str(i+1) + '. ' + html.escape(x['name']) + '</p></article>' for i,x in enumerate(batch))
    (ROOT / ('reference-' + name + '.html')).write_text('<!doctype html><meta charset="utf-8"><title>實物參考 ' + name + '</title><style>body{margin:0;background:white}main{width:800px;display:grid;grid-template-columns:repeat(4,200px)}article{height:200px;box-sizing:border-box;border:1px solid #ddd;text-align:center}img{width:180px;height:160px;object-fit:contain}p{margin:4px;font:14px sans-serif}</style><main>' + cells + '</main>')
print('Flower references prepared:', len(selected))
