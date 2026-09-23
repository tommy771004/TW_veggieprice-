"""Use official market-code identities to select photographic specimens.

Ambiguous multi-species trade categories are retained for review, not silently picked.
"""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
catalog = json.loads((ROOT / 'kmweb-catalog.json').read_text())
by_name = {x['name']: x for x in catalog}
official = json.loads((ROOT / 'efish-identities.json').read_text())
by_code = {x['code']: x for x in official['entries']}
inventory = [x for x in json.loads((ROOT / 'inventory.json').read_text())['items'] if x['category'] == 'seafood']
prepared = {x['key'] for p in ROOT.glob('batch-additional-*.json') for x in json.loads(p.read_text()) if not x.get('skipReason')}
synonyms = {'鯉魚': '鯉', '鯽魚': '鯽', '鮸魚': '鮸', '立翅旗魚': '立翅旗魚（白肉）',
            '脂眼凹鰺': '脂眼凹肩鰺', '真鰺': '日本竹筴魚', '紅尾圓鰺': '無斑圓鰺',
            '哈氏仿對蝦': '哈氏彷對蝦', '四盤耳烏賊': '貝瑞氏四盤耳烏賊',
            '銀花鱸': '條紋狼鱸'}
overrides = {'1011': '臺灣鯛', '1012': '紅色吳郭魚'}
groups = {}
unresolved = []
for item in inventory:
    if any(part in item['name'] for part in ('魚肚', '魚頭', '魚翅', '魚片', '魚腹', '魚肉', '魚尾')):
        unresolved.append({'name': item['name'], 'reason': 'requires_body_part_photo'})
        continue
    for code in item['codes']:
        if 'seafood-' + code in prepared:
            continue
        identity = by_code.get(code)
        # Frozen whole fish may share the same specimen. Body-part products are excluded.
        if identity is None and code.startswith('3') and not any(s in item['name'] for s in ('頭', '翅', '片', '腹', '肉', '尾')):
            identity = by_code.get('2' + code[1:])
        name = identity['officialIdentity'] if identity else ''
        name = overrides.get(code, synonyms.get(name, name))
        photo = by_name.get(name)
        if not photo:
            unresolved.append({'code': code, 'name': item['name'], 'officialIdentity': name,
                               'reason': 'identity_needs_review' if name else 'official_identity_unspecified'})
            continue
        id = urllib.parse.parse_qs(urllib.parse.urlparse(photo['sourceUrl']).query)['id'][0]
        key = 'kmweb-' + id
        if key not in groups:
            groups[key] = {**photo, 'key': key, 'category': 'seafood', 'marketCodes': [], 'marketNames': [],
                           'identitySourceUrl': official['sourceUrl'],
                           'referencePath': str(ROOT / 'references' / (key + '.png'))}
        groups[key]['marketCodes'].append(code)
        groups[key]['marketNames'].append(item['name'])

def download(item):
    try:
        path = Path(item['referencePath'])
        if not path.exists():
            path.write_bytes(urllib.request.urlopen(item['referenceUrl'], timeout=30).read())
        item['marketCodes'] = sorted(set(item['marketCodes']))
        item['marketNames'] = sorted(set(item['marketNames']))
        return item
    except Exception as error:
        print(item['name'], str(error))
        return None

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    selected = [x for x in pool.map(download, groups.values()) if x]
for offset in range(0, len(selected), 16):
    batch = selected[offset:offset+16]
    name = 'seafood-' + str(offset//16 + 1)
    (ROOT / ('batch-' + name + '.json')).write_text(json.dumps(batch, ensure_ascii=False, indent=2))
    cells = ''.join('<article><img src="references/' + Path(x['referencePath']).name + '"><p>' + str(i+1) + '. ' + html.escape(x['marketNames'][0] + '／' + x['name']) + '</p></article>' for i,x in enumerate(batch))
    (ROOT / ('reference-' + name + '.html')).write_text('<!doctype html><meta charset="utf-8"><title>實物參考 ' + name + '</title><style>body{margin:0;background:white}main{width:960px;display:grid;grid-template-columns:repeat(4,240px)}article{height:210px;box-sizing:border-box;border:1px solid #ddd;text-align:center;overflow:hidden}img{width:224px;height:165px;object-fit:contain}p{margin:4px;font:12px sans-serif}</style><main>' + cells + '</main>')
(ROOT / 'seafood-identity-review.json').write_text(json.dumps(unresolved, ensure_ascii=False, indent=2))
print('Selected species:', len(selected), 'market codes:', sum(len(x['marketCodes']) for x in selected))
