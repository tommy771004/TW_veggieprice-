"""Compile generated atlases and retain explicit, category-scoped name mappings."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
inventory = json.loads((ROOT / 'inventory.json').read_text())
assets = {}
regions = json.loads((ROOT / 'sprite-regions.json').read_text()) if (ROOT / 'sprite-regions.json').exists() else {}
clips = json.loads((ROOT / 'sprite-clips.json').read_text()) if (ROOT / 'sprite-clips.json').exists() else {}
for batch_path in sorted(ROOT.glob('batch-*.json')):
    batch_name = batch_path.stem.removeprefix('batch-')
    image = REPO / 'public/images/ingredients' / (batch_name + '-atlas.png')
    if not image.exists():
        continue
    batch = json.loads(batch_path.read_text())
    rows = (len(batch) + 3) // 4
    for index, item in enumerate(batch):
        if item.get('skipReason'):
            continue
        key = item['key']
        assets[key] = {**item, **({'crop': regions[key]} if key in regions else {}), **({'clip': clips[key]} if key in clips else {}), 'imagePath': '/images/ingredients/' + image.name,
                       'columns': 4, 'rows': rows, 'column': index % 4, 'row': index // 4,
                       'kind': 'ai_watercolor_from_photo'}

# Individually generated supplements retain the same source/mapping contract.
for single_path in sorted(ROOT.glob('single-*.json')):
    asset = json.loads(single_path.read_text())
    if asset['imagePath'].startswith(str(REPO / 'public') + '/'):
        asset['imagePath'] = '/' + str(Path(asset['imagePath']).relative_to(REPO / 'public'))
    if (REPO / 'public' / asset['imagePath'].lstrip('/')).exists():
        assets[asset['key']] = asset

# Only packaging/origin variants with the same specified appearance share a cell.
# Cultivar, colour, anatomical-part and processed-food variants need separate review.
code_aliases = {
    'LC93': 'LC3', 'FT91': 'FT1', 'FT96': 'FT6', 'FT97': 'FT7',
    'MJ2': 'MJ1', 'MC2': 'MC1', 'SD9': 'SD1', 'SM9': 'SM1',
    'FY94': 'FY4', 'LA91': 'LA1', 'SB9': 'SB2', 'LP9': 'LP1',
    'FB9': 'FB1', 'LI92': 'LI2', 'SV92': 'SV2', 'FL96': 'FL6',
    'FV94': 'FV4', 'FV96': 'FV6', 'FV91': 'FV1', 'FR9': 'FR1',
    'SC9': 'SC1', 'Y19': 'Y1', 'Y39': 'Y3', '459': '45',
    'MA2': 'MA1', 'ME2': 'ME1', 'LA92': 'LA2', 'LA94': 'LA4',
    'LI96': 'LI6', '119': '11', 'FL92': 'FL2', 'FV92': 'FV2',
    'MN2': 'MN1', 'ML2': 'ML1', 'MK2': 'MK1', 'MF2': 'MF1',
    '869': '86', '129': '12', 'H49': 'H4', 'FY97': 'FY7',
    'X69': 'X6', '46': '469', '85': '859', 'L9': 'L1',
}
mapping = {}
code_mapping = {}
for key, asset in assets.items():
    if key.startswith('seafood-'):
        code_mapping['seafood:' + key.removeprefix('seafood-')] = key
    for code in asset.get('marketCodes', []):
        code_mapping[asset['category'] + ':' + code] = key
    if not key.startswith(('flower-', 'seafood-', 'kmweb-', 'livestock-')):
        for item in inventory['items']:
            if item['category'] in ('N04', 'N05') and key in item['codes']:
                code_mapping[item['category'] + ':' + key] = key

def unfrozen(name):
    return re.sub(r'[（(【]?凍[)）】]?', '', name)

def flower_name(name):
    name = name.removeprefix('進口').removesuffix('進口')
    return {'嘉蘭(火焰百合)': '嘉蘭', '洋吉梗': '洋桔梗'}.get(name, name)

for item in inventory['items']:
    if item.get('assetKey'):
        for field in ('assetKey', 'mappingMethod'):
            item.pop(field, None)
        item['imagePath'] = None
        item['status'] = 'reference_found' if item.get('referenceUrl') else 'needs_reference'
    matched = None
    method = None
    if item['category'] in ('N04', 'N05'):
        for code in item['codes']:
            candidate = code if code in assets else code_aliases.get(code)
            if candidate in assets:
                matched = candidate
                method = 'exact_code' if candidate == code else 'same_appearance_origin_or_packaging'
                break
    elif item['category'] == 'N06':
        name = flower_name(item['name'])
        matched = next((key for key, asset in assets.items()
                        if key.startswith('flower-') and flower_name(asset['name']) == name), None)
        method = 'exact_flower_name' if matched else None
    elif item['category'] == 'seafood':
        matched = next((code_mapping.get('seafood:' + code) for code in item['codes']
                        if code_mapping.get('seafood:' + code)), None)
        method = 'official_market_code' if matched else None
        if not matched and '凍' in item['name']:
            fresh = next((x for x in inventory['items'] if x['category'] == 'seafood'
                          and x['name'] == unfrozen(item['name'])), None)
            if fresh:
                matched = next((code_mapping.get('seafood:' + code) for code in fresh['codes']
                                if code_mapping.get('seafood:' + code)), None)
                method = 'same_product_frozen' if matched else None
    elif item['category'] == 'livestock':
        matched = {'毛豬': 'livestock-hog', '白肉雞': 'livestock-white-chicken',
                   '紅羽土雞': 'livestock-red-chicken', '肉鴨': 'livestock-duck',
                   '肉鵝': 'livestock-goose'}.get(item['name'])
        matched = matched if matched in assets else None
        method = 'exact_product_name' if matched else None
    if matched:
        item.update({'assetKey': matched, 'imagePath': assets[matched]['imagePath'],
                     'referenceUrl': assets[matched]['referenceUrl'], 'status': 'illustrated',
                     'mappingMethod': assets[matched].get('mappingMethod', method)})
        mapping[item['category'] + ':' + item['name']] = matched
        for code in item['codes']:
            code_mapping[item['category'] + ':' + code] = matched

manifest = {'version': 1, 'assets': assets, 'nameMapping': mapping, 'codeMapping': code_mapping,
            'coverage': {'illustrations': len(assets), 'mappedNames': len(mapping),
                         'latestMappedNames': sum(x.get('status') == 'illustrated' and x['inLatest'] for x in inventory['items']),
                         'latestTotalNames': inventory['summary']['latestCategoryNames']}}
(ROOT / 'asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
(ROOT / 'inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2))
print(json.dumps(manifest['coverage'], ensure_ascii=False))

# Ship only the lookup and sprite geometry, never local paths or research metadata.
runtime = {**manifest, 'assets': {key: {k: a[k] for k in ('imagePath', 'columns', 'rows', 'column', 'row', 'cropTop', 'crop', 'clip') if k in a} for key, a in assets.items()}}
runtime.pop('coverage', None)
for asset in runtime['assets'].values():
    webp = asset['imagePath'].replace('.png', '.webp')
    if (REPO / 'public' / webp.lstrip('/')).exists():
        asset['imagePath'] = webp
(REPO / 'src/lib/ingredientImages.json').write_text(json.dumps(runtime, ensure_ascii=False, separators=(',', ':')) + '\n')
