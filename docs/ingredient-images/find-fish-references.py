"""Save the public Fisheries Research Institute catalogue for identity review."""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://www.tfrin.gov.tw/'
def fetch(page):
    url = BASE + 'theme_list.php?sub_theme=aquatic&theme=collection&page=' + str(page)
    content = urllib.request.urlopen(url, data=b'display_num=200', timeout=30).read().decode()
    results = []
    for block in re.findall(r'<figure class="card-seminar">(.*?)</figure>', content, re.S):
        link = re.search(r'<a href="([^\"]+)"', block)
        image = re.search(r'<img src="([^\"]+)"', block)
        name = re.search(r'中名：\s*([^<]+)', block)
        caption = re.search(r'<figcaption>(.*?)</figcaption>', block, re.S)
        if link and image and name:
            results.append({'name': html.unescape(name[1].strip()),
                'scientificName': html.unescape(caption[1].strip()) if caption else '',
                'sourceUrl': urllib.parse.urljoin(BASE, html.unescape(link[1])),
                'referenceUrl': urllib.parse.urljoin(BASE, html.unescape(image[1]))})
    return results
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    entries = [entry for page in pool.map(fetch, [1, 2, 3]) for entry in page]
entries = list({x['sourceUrl']: x for x in entries}.values())
(ROOT / 'tfrin-catalog.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2))
print('Catalogue entries:', len(entries))
