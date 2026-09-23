"""Measure painted bounds for CSS sprite views. Does not modify image pixels."""
import json, math
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent

def bands(counts,n):
 length=len(counts);centers=[(i+.5)*length/n for i in range(n)]
 for _ in range(12):
  weights=[0]*n;sums=[0]*n
  for x,count in enumerate(counts):
   group=min(range(n),key=lambda i:abs(x-centers[i]));weights[group]+=count;sums[group]+=count*x
  centers=[sums[i]/weights[i] if weights[i] else centers[i] for i in range(n)]
 borders=[0]
 for i in range(n-1):
  mid=(centers[i]+centers[i+1])/2;gap=centers[i+1]-centers[i]
  start=max(borders[-1]+1,round(mid-gap*.25));end=min(length,round(mid+gap*.25))
  candidates=range(start,end)
  borders.append(min(candidates,key=lambda x:(sum(counts[max(0,x-2):x+3]),abs(x-mid))))
 return list(zip(borders,borders[1:]+[length]))

regions={};clips={};edges=[]
for path in sorted(ROOT.glob('batch-*.json')):
 name=path.stem.removeprefix('batch-');impath=REPO/'public/images/ingredients'/(name+'-atlas.png')
 if not impath.exists():continue
 im=Image.open(impath).convert('RGB');w,h=im.size;batch=json.loads(path.read_text());rows=math.ceil(len(batch)/4)
 painted=[[] for y in range(h)]
 for i,pixel in enumerate(im.getdata()):
  if min(pixel)<175 or (min(pixel)<225 and max(pixel)-min(pixel)>25):painted[i//w].append(i%w)
 rowbands=bands([len(xs) for xs in painted],rows)
 histogram=[0]*w
 for xs in painted:
  for x in xs:histogram[x]+=1
 colbands=bands(histogram,4)
 for row,(top,bottom) in enumerate(rowbands):
  rowitems=batch[row*4:row*4+4]
  rowcolumns=colbands
  if not any(item.get('skipReason') for item in rowitems):
   histogram=[0]*w
   for xs in painted[top:bottom]:
    for x in xs:histogram[x]+=1
   rowcolumns=bands(histogram[:round(w*len(rowitems)/4)],len(rowitems))
  for col,(left,right) in enumerate(rowcolumns):
   if row*4+col>=len(batch):continue
   item=batch[row*4+col]
   if item.get('skipReason'):continue
   points=[(x,y) for y in range(top,bottom) for x in painted[y] if left<=x<right]
   if not points:continue
   x1=min(x for x,y in points);x2=max(x for x,y in points);y1=min(y for x,y in points);y2=max(y for x,y in points)
   if min(x1-left,right-x2,y1-top,bottom-y2)<3:edges.append(item['key'])
   size=min(max(x2-x1,y2-y1)*1.24,w,h);cx=(x1+x2)/2;cy=(y1+y2)/2;x=max(0,min(cx-size/2,w-size));y=max(0,min(cy-size/2,h-size))
   regions[item['key']]=[round(x/w,6),round(y/h,6),round(size/w,6),round(size/h,6)]
   # Restrict the square view to its own detected cell; padding can otherwise reveal neighbours.
   clips[item['key']]=[round(max(0,top-y)/size*100,4),round(max(0,x+size-right)/size*100,4),round(max(0,y+size-bottom)/size*100,4),round(max(0,left-x)/size*100,4)]
# Visual QA: exclude a neighbouring leek sliver from the carrot cell.
if 'SB1' in clips: clips['SB1'][3] = max(clips['SB1'][3], 20.0)
(ROOT/'sprite-regions.json').write_text(json.dumps(regions,ensure_ascii=False,indent=2))
(ROOT/'sprite-clips.json').write_text(json.dumps(clips,ensure_ascii=False,indent=2))
(ROOT/'sprite-edge-review.json').write_text(json.dumps(edges,ensure_ascii=False,indent=2))
print('Measured',len(regions),'edge review',len(edges),edges)
