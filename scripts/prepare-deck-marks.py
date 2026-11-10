"""Recover selectable deck marks from supplied card faces; originals are untouched."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.preview-checks/qa-python'))
from PIL import Image
APP=ROOT/'tyrants-card-studio';OUT=APP/'dist/assets/deck-marks';OUT.mkdir(exist_ok=True)
library=json.loads((APP/'dist/library.json').read_text('utf8'))
sources={p['id']:Image.open(APP/'dist'/p['cards'][0]['image']).convert('RGB').resize((770,1072)) for p in library if p['id'] in ['faerie','mercenaries','siege','ooze','wizards','delver']}
for deck in ['drow','dragons','elemental','demons']:
 im=Image.open(ROOT/'.preview-checks/tyrants-official-reference'/('cards-'+deck+'.jpg')).convert('RGB');sources[deck]=im.crop((0,0,749,1046)).resize((770,1072))
for name,im in sources.items():
 # Work only in the footer's icon bay, before the printed card number.
 patch=im.crop((28,945,146,1070)).convert('RGBA');w,h=patch.size
 ink={(x,y) for y in range(h) for x in range(w) if min(patch.getpixel((x,y))[:3])>145}
 components=[]
 while ink:
  start=ink.pop();todo=[start];part=[start]
  while todo:
   x,y=todo.pop()
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
    q=(x+dx,y+dy)
    if q in ink:ink.remove(q);todo.append(q);part.append(q)
  xs=[x for x,y in part];ys=[y for x,y in part];box=(min(xs),min(ys),max(xs)+1,max(ys)+1)
  if len(part)>35 and box[1]>0 and box[2]-box[0]>=12 and box[3]-box[1]>=9:components.append((len(part),box))
 if not components:raise RuntimeError('No deck mark found: '+name)
 primary=max(components)[1];cx=(primary[0]+primary[2])/2
 nearby=[b for _,b in components if abs((b[0]+b[2])/2-cx)<22 and b[0]<primary[2]+8 and b[2]>primary[0]-8]
 box=(max(0,min(b[0] for b in nearby)-2),max(0,min(b[1] for b in nearby)-2),min(w,max(b[2] for b in nearby)+2),min(h,max(b[3] for b in nearby)+2))
 fixed={'siege':(23,1009,71,1051),'wizards':(60,970,142,1042),'drow':(32,975,81,1047)}
 result=im.crop(fixed[name]).convert('RGBA') if name in fixed else patch.crop(box)
 result.putdata([(255,255,255,max(0,min(255,round((min(r,g,b)-90)*255/165)))) for r,g,b,a in result.getdata()]);result.save(OUT/(name+'.png'));print(name,result.size)
