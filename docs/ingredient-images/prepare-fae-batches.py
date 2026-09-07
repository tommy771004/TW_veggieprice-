"""Prepare reviewed quiz-label matches for additional produce and seafood."""
import concurrent.futures
import html
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent
photos = json.loads((ROOT / 'fae-photo-candidates.json').read_text())
# Keys are exact market codes except prefixed seafood/livestock keys.
targets = [
 ('FE2', '冬瓜'), ('G1', '仙桃'), ('G49', '奇異果'), ('N9', '李子'),
 ('11', '椰子'), ('859', '榴槤'), ('G7', '橄欖'), ('839', '櫻桃'),
 ('G9', '波羅蜜'), ('MA1', '洋菇'), ('FW2', '洛神葵'), ('LT2', '海帶'),
 ('SA7', '甜菜'), ('SE5', '紅蔥頭'), ('S49', '綠葡萄'), ('FZ1', '花生'),
 ('SR1', '菱角'), ('SN1', '蓮藕'), ('469', '藍莓'), ('O99', '西洋梨'),
 ('ME1', '金針菇'), ('SU2', '山藥'), ('SU3', '樹薯，'), ('FU3', '石蓮花，'),
 ('seafood-2105', '丁香魚'), ('seafood-2131', '劍旗魚'), ('seafood-2271', '午仔魚'), ('seafood-1011', '吳郭魚'),
 ('seafood-2114', '太平洋黑鮪魚'), ('seafood-2141', '康氏馬加鰆(土魠魚)'), ('seafood-5022', '文蛤'), ('seafood-2231', '斑海鯰'),
 ('seafood-2135', '旗魚（雨傘旗魚）'), ('seafood-4032', '泰國蝦（羅氏沼蝦）'), ('seafood-5888', '海瓜子簾蛤，'), ('seafood-2491', '海鱺'),
 ('seafood-4091', '火燒蝦（鬚赤蝦）'), ('seafood-2158', '灰鯖鮫'), ('seafood-1051', '烏魚'), ('seafood-5012', '牡蠣'),
 ('seafood-2341', '白帶魚'), ('seafood-4015', '白蝦'), ('seafood-1171', '石斑魚(點帶石斑魚)'), ('seafood-3521', '秋刀魚'),
 ('seafood-2169', '章魚'), ('seafood-2071', '竹筴魚'), ('seafood-2163', '花枝(烏賊)'), ('seafood-1041', '虱目魚'),
 ('seafood-1181', '金鯧(布氏鯧鰺)'), ('seafood-2093', '銀鯧'), ('seafood-1191', '香魚'), ('seafood-6114', '魚肉'),
 ('seafood-2331', '鯖魚'), ('seafood-2122', '鰹魚（圓花鰹）'), ('seafood-1031', '鰻魚(日本鰻鱺)'), ('seafood-2113', '黃鰭鮪'),
 ('seafood-1173', '龍膽石斑魚'), ('seafood-4131', '龍蝦'), ('livestock-goat', '山羊'), ('livestock-chicken', '雞'),
 ('livestock-duck', '鴨，'), ('livestock-goose', '鵝，'),
]
exclusions = json.loads((ROOT / 'reference-exclusions.json').read_text())
selected = []
for key, name in targets:
    item = next((x for x in photos if x['name'] == name), None)
    if item is None:
        item = next((x for x in photos if x['name'].startswith(name)), None)
    if item is None:
        print('Missing:', key, name)
        continue
    if key in exclusions:
        item = {**item, 'skipReason': exclusions[key]}
    selected.append({**item, 'key': key, 'referencePath': str(ROOT / 'references' / ('fae-' + key + '.jpg'))})
def download(item):
    try:
        path = Path(item['referencePath'])
        if not path.exists():
            path.write_bytes(urllib.request.urlopen(item['referenceUrl'], timeout=30).read())
        return item
    except Exception as error:
        print(item['key'], str(error))
        return None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    selected = [x for x in pool.map(download, selected) if x]
for offset in range(0, len(selected), 16):
    batch = selected[offset:offset+16]
    name = 'additional-' + str(offset//16 + 1)
    (ROOT / ('batch-' + name + '.json')).write_text(json.dumps(batch, ensure_ascii=False, indent=2))
    cells = ''.join('<article><img src="references/' + Path(x['referencePath']).name + '"><p>' + str(i+1) + '. ' + html.escape(x['name']) + '</p></article>' for i,x in enumerate(batch))
    (ROOT / ('reference-' + name + '.html')).write_text('<!doctype html><meta charset="utf-8"><title>實物參考 ' + name + '</title><style>body{margin:0;background:white}main{width:800px;display:grid;grid-template-columns:repeat(4,200px)}article{height:200px;box-sizing:border-box;border:1px solid #ddd;text-align:center;overflow:hidden}img{width:180px;height:155px;object-fit:contain}p{margin:4px;font:12px sans-serif}</style><main>' + cells + '</main>')
print('Additional references prepared:', len(selected))
