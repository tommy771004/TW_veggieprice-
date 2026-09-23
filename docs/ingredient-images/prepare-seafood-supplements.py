"""Additional official-identity matches and explicitly labelled trade-name representatives."""
import concurrent.futures,json,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parent
catalog=json.loads((ROOT/'kmweb-catalog.json').read_text());byname={x['name']:x for x in catalog}
inv=json.loads((ROOT/'inventory.json').read_text())['items'];official=json.loads((ROOT/'efish-identities.json').read_text());ids={x['code']:x['officialIdentity'] for x in official['entries']}
prepared={c for x in inv if x.get('status')=='illustrated' and x['category']=='seafood' for c in x['codes']}
synonyms={'脂眼凹鰺':'脂眼凹肩鰺','鮸魚':'鮸'}
# These names are explicitly listed as common names by the source photograph atlas.
# A broad trade name receives a documented representative, never an exact-species claim.
representatives={'2571':'單角革單棘魨','2512':'暗點胡椒鯛','3116':'南方黑鮪','2531':'黑角魚','2301':'尖身帶鰆','2611':'斑鱵','2321':'鱗網帶鰆','2221':'灰海鰻','2441':'印度牛尾魚','2211':'花斑狗母魚','2072':'金帶細鰺','2440':'石狗公','2041':'黑斑海緋鯉','2302':'巴拉金梭魚','5101':'竹蟶','2047':'巴氏項鰭魚','4101':'高脊管鞭蝦','2482':'史氏紅諧魚','2901':'翻車魨','4406':'雄壯鬚蝦','4404':'東方異腕蝦','2311':'寶刀魚','1061':'大鱗龜鮻','1170':'銀臭肚魚','2563':'銀臭肚魚','2165':'萊氏擬烏賊','2483':'雙色鯨鸚哥魚','2161':'太平洋魷','2252':'日本烏魴','3156':'短尾真鯊','2191':'青嘴龍占魚','2411':'利達舌鰨','4131':'錦繡龍蝦'}
groups={}
for item in inv:
 if item['category']!='seafood' or any(t in item['name'] for t in ('其他','肚','頭','翅','片','腹','肉','魚尾','熟','鯊煙')):continue
 for code in item['codes']:
  if code in prepared:continue
  base='2'+code[1:] if code.startswith('3') else code
  identity=ids.get(code,ids.get(base,''));name=synonyms.get(identity,identity)
  method='official_market_code'
  if name not in byname:
   name=representatives.get(code,representatives.get(base,''));method='representative_documented_trade_name'
  if name not in byname:continue
  photo=byname[name];id=urllib.parse.parse_qs(urllib.parse.urlparse(photo['sourceUrl']).query)['id'][0];key='kmweb-'+id
  if key not in groups:groups[key]={**photo,'key':key,'category':'seafood','marketCodes':[],'marketNames':[],'mappingMethod':method,'identitySourceUrl':official['sourceUrl'],'referencePath':str(ROOT/'references'/('kmweb-'+id+'.png'))}
  groups[key]['marketCodes'].append(code);groups[key]['marketNames'].append(item['name'])
  if method.startswith('representative'):groups[key]['mappingNote']='來源圖鑑明列市場俗名，使用該交易類別的代表物種；不表示所有該名稱交易皆為同一物種。'
def get(x):
 try:
  path=Path(x['referencePath'])
  if not path.exists():
   req=urllib.request.Request(x['referenceUrl'],headers={'User-Agent':'IngredientReferenceResearch/1.0'})
   path.write_bytes(urllib.request.urlopen(req,timeout=20).read())
  return x
 except Exception as e:print('Failed',x['name'],str(e),flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:items=[x for x in pool.map(get,groups.values()) if x]
for offset in range(0,len(items),16):
 (ROOT/('batch-seafood-extra-'+str(offset//16+1)+'.json')).write_text(json.dumps(items[offset:offset+16],ensure_ascii=False,indent=2))
print('Prepared',len(items),'species /',sum(len(x['marketCodes']) for x in items),'codes',flush=True)
