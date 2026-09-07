"""Collect candidate photo references; candidates require identity/visual review."""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
inventory = json.loads((ROOT / 'inventory.json').read_text())
names = sorted({re.sub(r'^進口', '', x['name']) for x in inventory['items']
                if x['category'] == 'N06' and x['inLatest']})
CACHE = ROOT / 'source-cache'
CACHE.mkdir(exist_ok=True)

def fetch(name):
    url = 'https://www.twflower.org/search?' + urllib.parse.urlencode({'keywords': name})
    cache = CACHE / ('flower-' + hashlib.sha256(name.encode()).hexdigest()[:12] + '.html')
    try:
        if not cache.exists():
            cache.write_bytes(urllib.request.urlopen(url, timeout=30).read())
        page = cache.read_text()
        candidates = []
        for link, body in re.findall(r'<a[^>]+href="(detail[^\"]+)"[^>]*>(.*?)</a>', page, re.S):
            image = re.search(r'<img[^>]+src="([^\"]+)"', body, re.S)
            label = re.search(r'<h5>(.*?)</h5>', body, re.S)
            if image and label:
                candidates.append({'name': html.unescape(re.sub(r'\s+', ' ', label[1]).strip()),
                    'sourceUrl': urllib.parse.urljoin('https://www.twflower.org/', link.replace('\\', '/')),
                    'referenceUrl': html.unescape(image[1])})
        return {'query': name, 'searchUrl': url, 'candidates': candidates}
    except Exception as exc:
        return {'query': name, 'searchUrl': url, 'candidates': [], 'error': str(exc)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(fetch, names))
(ROOT / 'flower-reference-candidates.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps({'queries': len(results), 'withCandidates': sum(bool(x['candidates']) for x in results)}, ensure_ascii=False))
