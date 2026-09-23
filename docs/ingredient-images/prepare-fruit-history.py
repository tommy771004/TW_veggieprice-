"""Prepare labelled photographs for historical scheduled-data fruit names."""
import json,urllib.request,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parent
varieties=json.loads((ROOT/'fae-variety-photo-candidates.json').read_text());quiz=json.loads((ROOT/'fae-photo-candidates.json').read_text())
choices=[('X19','蘋果-五爪進口','元帥（五爪、五瓜）',False),('X6','蘋果-富士','富士（富吉、福吉）',False),('43','桑椹','圓果桑',False),('B5','鳳梨-蘋果鳳梨','蘋果鳳梨（台農6號）',False),('N1','李-沙蓮李','沙連李',False),('N2','李-桃接李','桃接李',False),('N4','李-黃肉李','黃肉李',False),('N6','李-泰安李','泰安李',False),('O5','梨-豐水梨','豐水梨',False),('K2','龍眼-十月眼','十月龍眼',False),('F2','雜柑-金棗','金棗（長實金柑）',True),('41','梅','梅子',True),('42','楊梅','楊梅',True),('849','石榴-進口','石榴',True),('T6','西瓜-紅肉','普通紅肉小西瓜',False),('W6','洋香瓜-光面綠肉','光皮洋香瓜',False)]
items=[]
for key,name,label,isquiz in choices:
 source=next(x for x in (quiz if isquiz else varieties) if x['name'].startswith(label))
 items.append({**source,'key':key,'name':name,'referenceName':source['name'],'referencePath':str(ROOT/'references'/('fruit-history-'+key+'.jpg')),'mappingMethod':'labelled_photo_cultivar_or_trade_representative'})
def fetch(x):
 p=Path(x['referencePath'])
 if not p.exists():p.write_bytes(urllib.request.urlopen(urllib.request.Request(x['referenceUrl'],headers={'User-Agent':'IngredientReferenceResearch/1.0'}),timeout=25).read())
 return x
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:items=list(pool.map(fetch,items))
(ROOT/'batch-fruits-history.json').write_text(json.dumps(items,ensure_ascii=False,indent=2))
print('Prepared',len(items))
