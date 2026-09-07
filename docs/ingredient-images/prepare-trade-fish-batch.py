"""Prepare explicit representatives of official multi-species market categories."""
import json,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parent
catalog={x['name']:x for x in json.loads((ROOT/'kmweb-catalog.json').read_text())}
# Representative species are documented in the official category or photo atlas.
choices=[('鬍鯰',['1101','1111'],'淡水鯰類以臺灣本土土虱代表'),('海鱺',['1081'],'圖鑑俗名鱺魚'),('棕點石斑魚',['2201'],'官方交易分類明列棕點石斑魚、鞍帶石斑魚，採棕點代表'),('臺灣鳳螺',['5111'],'鳳螺類採臺灣鳳螺代表'),('大黃魚',['1167','2061'],'黃魚類採大黃魚代表'),('星點笛鯛',['2042','6011'],'官方交易分類明列星點笛鯛、長尾濱鯛，採星點代表'),('鱗馬鞭魚',['2371'],'官方馬鞭魚科採鱗馬鞭魚代表'),('無斑圓尾鶴鱵',['2381'],'官方鶴鱵科採無斑圓尾鶴鱵代表'),('花蓮小沙丁魚',['2102'],'官方小沙丁屬採花蓮小沙丁魚代表'),('日本沙鮻',['2551'],'官方沙鮻科採日本沙鮻代表'),('鋸緣青蟹',['4511'],'官方明列鋸緣青蟹、銹斑蟳等，採青蟹代表'),('路易氏雙髻鯊',['2160','3160'],'雙髻鮫類採路易氏雙髻鯊代表'),('安大略鱒',['2781','3781'],'鮭魚採Salmo salar大西洋鮭代表，非所有鮭魚種'),('白舌尾甲鰺',['2080'],'圖鑑明列黑魽俗名，官方歸其他鰺'),('烏面眶棘鱸',['2083'],'圖鑑明列赤尾冬俗名'),('高體斑鮃',['2401'],'官方鮃鰈類採高體斑鮃代表')]
items=[]
for name,codes,note in choices:
 a=catalog[name];sid=urllib.parse.parse_qs(urllib.parse.urlparse(a['sourceUrl']).query)['id'][0]
 items.append({**a,'key':'kmweb-'+sid,'category':'seafood','marketCodes':codes,'mappingMethod':'representative_official_trade_category','mappingNote':note+'；此插圖為類別代表，不表示所有交易皆是同一物種。','identitySourceUrl':'https://efish.fa.gov.tw/efish/common/atlaslist.htm','referencePath':str(ROOT/'references'/('kmweb-'+sid+'.png'))})
def fetch(a):
 p=Path(a['referencePath'])
 if not p.exists():
  req=urllib.request.Request(a['referenceUrl'],headers={'User-Agent':'IngredientReferenceResearch/1.0'})
  p.write_bytes(urllib.request.urlopen(req,timeout=25).read())
 return a
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 items=list(pool.map(fetch,items))
(ROOT/'batch-seafood-trade.json').write_text(json.dumps(items,ensure_ascii=False,indent=2))
print('Prepared',len(items),'trade category representatives')
