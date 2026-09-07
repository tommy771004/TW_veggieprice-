"""Collect the MOA fish/shellfish photo catalogue and its explicit common names."""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://kmweb.moa.gov.tw/'
CACHE = ROOT / 'source-cache'
CACHE.mkdir(exist_ok=True)
def read(url, key):
    path = CACHE / (key + '.html')
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=30).read())
    return path.read_text()
def page(number):
    url = BASE + 'theme_list.php?theme=fisheasy&display_num=80&page=' + str(number)
    text = read(url, 'kmweb-list-' + str(number))
    return [{'name': html.unescape(n), 'sourceUrl': urllib.parse.urljoin(BASE, html.unescape(u)),
             'referenceUrl': urllib.parse.urljoin(BASE, html.unescape(i))}
            for u,n,i in re.findall(r'<a class="bglink" href="([^\"]+)" title="([^\"]+)"[^>]+background-image:url\(\x27([^\x27]+)', text)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    items = [x for batch in pool.map(page, range(1,11)) for x in batch]
items = list({x['sourceUrl']: x for x in items}.values())
(ROOT / 'kmweb-catalog.json').write_text(json.dumps(items, ensure_ascii=False, indent=2))
print('MOA fish/shellfish catalogue:', len(items))

def detail(item):
    id = urllib.parse.parse_qs(urllib.parse.urlparse(item['sourceUrl']).query)['id'][0]
    try:
        text = read(item['sourceUrl'], 'kmweb-fish-' + id)
        common = re.search(r'title="俗名"><span>(.*?)</span>', text, re.S)
        scientific = re.search(r'title="學名"><span>(.*?)</span>', text, re.S)
        item['commonNamesText'] = html.unescape(re.sub('<[^>]*>', '', common[1])) if common else ''
        item['commonNames'] = re.split('[、，,；;]', item['commonNamesText'])
        item['scientificName'] = html.unescape(re.sub('<[^>]*>', '', scientific[1])) if scientific else ''
    except Exception as error:
        item['error'] = str(error)
    return item
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    items = list(pool.map(detail, items))
(ROOT / 'kmweb-catalog.json').write_text(json.dumps(items, ensure_ascii=False, indent=2))
print('Common names collected:', sum(bool(x.get('commonNamesText')) for x in items))
