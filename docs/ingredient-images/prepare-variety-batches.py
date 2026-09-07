"""Prepare explicit market-code matches from labelled FAE cultivar photographs."""
import concurrent.futures, html, json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent
photos=json.loads((ROOT/'fae-variety-photo-candidates.json').read_text())
targets=[('SU21','人參山藥'),('SU1','紅薯山藥'),('FY1','台南白'),('FY3','超甜玉米-雪珍'),('FY8','水果玉米-白龍王'),('FY5','黑寶玉米'),('MI1','秀珍菇'),('SO2','芋心地瓜(花蓮1號)'),('B8','西瓜鳳梨'),('LI6','蘿蔓萵苣'),('SJ1','麵芋'),('SJ3','赤芽芋'),('LF1','大葉種'),('FN5','醜豆'),('LA2','普通甘藍(硬種)'),('LA4','紫甘藍'),('LJ3','大葉芥菜'),('R4','凱特'),('F6','黃金檸檬'),('F5','萊姆'),('SE2','北蔥'),('SE3','大蔥'),('SA4','櫻桃蘿蔔'),('SH4','孟宗竹筍'),('LD1','青梗白菜'),('livestock-white-chicken','白肉雞'),('livestock-red-chicken','紅羽土雞'),('livestock-hog','LYD三品種雜交肉豬'),('livestock-black-goat','臺灣黑山羊(Taiwan black goat)'),('livestock-nubian-goat','努比亞山羊 (Nubian)'),('livestock-alpine-goat','阿爾拜因山羊 (Alpine)'),('livestock-boer-goat','波爾山羊 (Boer)')]
# Exact scientific identities may fill seafood gaps; never use a whole animal for a body-part product.
inv=json.loads((ROOT/'inventory.json').read_text())['items'];ids=json.loads((ROOT/'efish-identities.json').read_text())['entries'];bycode={x['code']:x['officialIdentity'] for x in ids}
illustrated={c for x in inv if x.get('status')=='illustrated' for c in x['codes'] if x['category']=='seafood'}
for x in inv:
 if x['category']!='seafood' or any(t in x['name'] for t in ('肚','頭','翅','片','腹','肉','尾')):continue
 for code in x['codes']:
  identity=bycode.get(code,'')
  if code not in illustrated and identity and any(p['name']==identity for p in photos):targets.append(('seafood-'+code,identity))
items=[]
for key,name in targets:
 candidates=[x for x in photos if x['name']==name]
 # Same broad label exists on unrelated pages: explicit 空心菜 page only.
 if key=='LF1':candidates=[x for x in candidates if 'id=59' in x['sourceUrl']]
 if not candidates:print('Unresolved',key,name);continue
 item={**candidates[0],'key':key,'referencePath':str(ROOT/'references'/('variety-'+key+'.jpg'))}
 items.append(item)
def download(x):
 try:
  p=Path(x['referencePath'])
  if not p.exists():p.write_bytes(urllib.request.urlopen(x['referenceUrl'],timeout=20).read())
  return x
 except Exception as e:print('Download failed',x['key'],str(e));return None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:items=[x for x in pool.map(download,items) if x]
for offset in range(0,len(items),16):
 batch=items[offset:offset+16];name='variety-'+str(offset//16+1)
 (ROOT/('batch-'+name+'.json')).write_text(json.dumps(batch,ensure_ascii=False,indent=2))
 cells=''.join('<article><img src="references/'+Path(x['referencePath']).name+'"><p>'+str(i+1)+'. '+html.escape(x['name'])+'</p></article>' for i,x in enumerate(batch))
 (ROOT/('reference-'+name+'.html')).write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}main{width:960px;display:grid;grid-template-columns:repeat(4,240px)}article{height:210px;box-sizing:border-box;border:1px solid #ddd;text-align:center;overflow:hidden}img{width:224px;height:165px;object-fit:contain}p{margin:4px;font:12px sans-serif}</style><main>'+cells+'</main>')
print('Prepared',len(items))
