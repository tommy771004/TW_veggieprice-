"""Validate provenance, runtime file paths, mappings and sprite bounds."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parent.parent
m=json.loads((ROOT/'asset-manifest.json').read_text());runtime=json.loads((REPO/'src/lib/ingredientImages.json').read_text());inventory=json.loads((ROOT/'inventory.json').read_text())
for key,a in m['assets'].items():
 assert a.get('sourceUrl','').startswith('https://'),('missing provenance',key)
 assert a.get('referenceUrl','').startswith('https://'),('missing photo',key)
 r=runtime['assets'][key]
 assert r['imagePath'].startswith('/images/ingredients/'),('invalid public path',key)
 assert (REPO/'public'/r['imagePath'].lstrip('/')).exists(),('missing runtime image',key)
 assert all(math.isfinite(v) for v in r.get('crop',[0,0,1,1])),key
 if 'crop' in r:
  x,y,w,h=r['crop'];assert x>=0 and y>=0 and w>0 and h>0 and x+w<=1.00001 and y+h<=1.00001,('crop outside image',key)
 if 'clip' in r:
  t,right,b,left=r['clip'];assert all(math.isfinite(v) and 0<=v<100 for v in r['clip']) and t+b<100 and left+right<100,('invalid cell clip',key)
for scope,key in m['nameMapping'].items():assert key in m['assets'],scope
for scope,key in m['codeMapping'].items():assert key in m['assets'],scope
for item in inventory['items']:
 if item['status']=='illustrated':
  assert m['nameMapping'][item['category']+':'+item['name']]==item['assetKey'],item['name']
  assert not item['name'].startswith('休市'),item['name']
# Same written name can identify a different species in a different category.
flower=m['nameMapping'].get('N06:火龍果');assert flower and flower.startswith('flower-')
assert m['codeMapping'].get('N04:LP2')=='LP2' and m['codeMapping'].get('N04:LA5')=='LA5'
assert not any('/Users/' in str(value) for a in runtime['assets'].values() for value in a.values())
print('Validated',len(m['assets']),'assets,',len(m['nameMapping']),'names; category-scoped mapping and crop bounds passed')
