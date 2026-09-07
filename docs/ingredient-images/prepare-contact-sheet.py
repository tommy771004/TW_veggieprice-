"""Create a labelled HTML reference board without editing source image pixels."""
import html,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
for name in sys.argv[1:]:
 batch=json.loads((ROOT/f'batch-{name}.json').read_text())
 cells=''
 for i,x in enumerate(batch):
  label=html.escape(x.get('referenceName',x['name']))
  src='references/'+Path(x.get('referencePath','')).name
  extra=x.get('supplementaryReferences',[])
  content='<div class="blank">待確認</div>' if x.get('skipReason') else f'<img style="width:{112 if extra else 224}px" src="{html.escape(src)}">'
  if extra:
   content+=f'<img style="width:112px" src="references/{html.escape(Path(extra[0]["referencePath"]).name)}">'
  cells+=f'<article>{content}<p>{i+1}. {label}</p></article>'
 (ROOT/f'reference-{name}.html').write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}main{width:960px;display:grid;grid-template-columns:repeat(4,240px)}article{height:210px;box-sizing:border-box;border:1px solid #ddd;text-align:center;overflow:hidden}img,.blank{width:224px;height:165px;object-fit:contain}p{margin:4px;font:12px sans-serif}</style><main>'+cells+'</main>')
