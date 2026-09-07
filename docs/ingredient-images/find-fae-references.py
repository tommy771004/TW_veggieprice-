"""Extract explicitly identified food-quiz photographs, not the illustrated map icons."""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
catalog = json.loads((ROOT / 'fae-catalog.json').read_text())
ids = sorted({urllib.parse.parse_qs(urllib.parse.urlparse(x['sourceUrl']).query)['id'][0] for x in catalog})
CACHE = ROOT / 'source-cache'
CACHE.mkdir(exist_ok=True)
def fetch(id):
    url = 'https://fae.moa.gov.tw/map/food_item.php?type=AS01&id=' + id
    path = CACHE / ('fae-' + id + '.html')
    try:
        if not path.exists():
            path.write_bytes(urllib.request.urlopen(url, timeout=30).read())
        text = path.read_text()
        entries = []
        for block in re.split(r'<div class="asgrids[^\"]*">', text)[1:]:
            image = re.search(r'background-image:url\(([^)]+)\)', block)
            label = re.search(r'<div class="exTxt">這是([^。<]+)。', block)
            if image and label:
                entries.append({'name': html.unescape(label[1]), 'sourceUrl': url,
                                'referenceUrl': urllib.parse.urljoin(url, html.unescape(image[1]))})
        return entries
    except Exception as error:
        print(id, str(error))
        return []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    entries = [item for batch in pool.map(fetch, ids) for item in batch]
entries = list({x['referenceUrl']: x for x in entries}.values())
(ROOT / 'fae-photo-candidates.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2))
print('Identified photo candidates:', len(entries))
