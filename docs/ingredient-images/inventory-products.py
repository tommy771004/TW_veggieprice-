"""Distinct scheduled-data names, retaining category/code identity and asset metadata.

Run from any directory. Raw public data is read only. Invalid snapshots are reported.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
OUTPUT = ROOT / 'inventory.json'
previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {'items': []}
old = {(x['category'], x['name']): x for x in previous['items']}
items = {}
invalid = []

def add(name, category, code, source, latest, origin='json_name'):
    if not isinstance(name, str) or not name.strip():
        return
    raw = name
    name = name.strip()
    key = (category, name)
    if key not in items:
        status = 'not_a_product' if name == '休市' else ('needs_identity_review' if any(x in name for x in ('其他', '其它', '什魚', '下雜魚')) else 'needs_reference')
        items[key] = {**old.get(key, {}), 'id': hashlib.sha256((category + ':' + name).encode()).hexdigest()[:12],
            'name': name, 'category': category, 'rawNames': set(), 'codes': set(), 'sources': set(),
            'inLatest': False, 'nameOrigin': origin}
        items[key].setdefault('status', status)
        items[key].setdefault('referenceUrl', None)
        items[key].setdefault('imagePath', None)
    item = items[key]
    item['rawNames'].add(raw)
    if code is not None and str(code).strip():
        item['codes'].add(str(code).strip())
    item['sources'].add(source)
    item['inLatest'] |= latest

paths = sorted((REPO / 'public/data/daily').glob('*.json')) + [REPO / 'public/data/latest-opendata.json', REPO / 'public/data/latest-seafood.json', REPO / 'public/data/latest-livestock.json']
for path in paths:
    source = str(path.relative_to(REPO))
    try:
        content = json.loads(path.read_text())
    except (ValueError, OSError) as error:
        invalid.append({'file': source, 'error': str(error)})
        continue
    latest = path.name.startswith('latest-')
    data = content.get('data', []) if isinstance(content, dict) else content
    if path.name == 'latest-livestock.json':
        for row in data.get('sheep', []):
            add(row.get('productName'), 'livestock', row.get('productID'), source, True)
        # These feed fields have no product-name column; retain the application's labels.
        for name in ('毛豬', '白肉雞', '紅羽土雞', '肉鵝', '肉鴨', '羊', '雞蛋'):
            add(name, 'livestock', None, source, True, 'ui_label_for_json_fields')
    elif path.name == 'latest-seafood.json':
        for row in data:
            add(row.get('魚貨名稱'), 'seafood', row.get('品種代碼'), source, latest)
    else:
        for row in data:
            if isinstance(row, dict):
                add(row.get('CropName'), row.get('TcType', 'unknown'), row.get('CropCode'), source, latest)

rows = sorted(items.values(), key=lambda x: (x['category'], x['name']))
for item in rows:
    for field in ('rawNames', 'codes', 'sources'):
        item[field] = sorted(item[field])
summary = {'totalCategoryNames': len(rows), 'distinctNames': len({x['name'] for x in rows}),
           'latestCategoryNames': sum(x['inLatest'] for x in rows),
           'categories': dict(Counter(x['category'] for x in rows)), 'invalidFiles': invalid}
OUTPUT.write_text(json.dumps({'summary': summary, 'items': rows}, ensure_ascii=False, indent=2))
print(json.dumps(summary, ensure_ascii=False))
