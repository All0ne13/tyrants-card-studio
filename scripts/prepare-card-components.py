"""Recover print components from the supplied raster Faerie cards, unchanged originals."""
import sys,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.preview-checks/qa-python'))
from PIL import Image
APP=ROOT/'tyrants-card-studio'; OUT=APP/'dist/assets/card-parts';OUT.mkdir(exist_ok=True)
rows=json.loads((ROOT/'.preview-checks/tyrants-expansion-prepared/cards.json').read_text('utf8'))
faerie=[r for r in rows if r['deckId']=='faerie']
def face(row):return Image.open(ROOT/'.preview-checks/tyrants-expansion-prepared'/row['originalAsset']).convert('RGB').resize((770,1072),Image.Resampling.LANCZOS)
def runs(im,box):
 x0,y0,x1,y1=box; result=[];start=None
 for x in range(x0,x1+1):
  ink=x<x1 and any(min(im.getpixel((x,y)))>210 for y in range(y0,y1))
  if ink and start is None:start=x
  if not ink and start is not None:result.append((start,x));start=None
 return result
def white(im,box):
 patch=im.crop(box).convert('RGBA');data=[]
 for rr,g,b,a in patch.getdata():data.append((255,255,255,max(0,min(255,round((min(rr,g,b)-110)*255/145)))))
 patch.putdata(data);return patch
glyphs={'title':{},'meta':{},'race':{},'number':{}};images=[]
def add_text(im,text,box,kind,baseline):
 rr=runs(im,box);chars=text.replace(' ','')
 if len(rr)!=len(chars):return
 for ch,(x0,x1) in zip(chars,rr):
  if ch in glyphs[kind]:continue
  patch=white(im,(x0,box[1],x1,box[3]));bb=patch.getbbox()
  if not bb:continue
  patch=patch.crop(bb);entry={'width':patch.width,'height':patch.height,'dy':box[1]+bb[1]-baseline,'advance':patch.width+2}
  glyphs[kind][ch]=entry;images.append((entry,patch))
aspects={'Gremlin':'Malice','Blight':'Conquest','Huldra':'Guile','Naiad':'Ambition'}
types={'Gremlin':'Faerie','Blight':'Plant','Huldra':'Nymph','Naiad':'Nymph','Lost Huntman':'Human','Lich Knights':'Undead','Lantern King':'Eldest','Annis Hag':'Hag'}
for row in faerie:
 im=face(row);add_text(im,row['name'],(35,35,650,116),'title',100)
 add_text(im,str(row['cost']),(670,35,740,108),'number',100)
 if row['name'] in aspects:add_text(im,aspects[row['name']],(138,119,440,159),'meta',155)
 if row['name'] in types:add_text(im,types[row['name']],(440,118,725,159),'race',155)
gremlin=face(faerie[0])
for ch,box in [('F',(630,119,647,159)),('a',(647,119,660,159)),('e',(663,119,676,159)),('r',(679,119,695,159)),('i',(697,119,704,159))]:
 patch=white(gremlin,box);bb=patch.getbbox();patch=patch.crop(bb);entry={'width':patch.width,'height':patch.height,'dy':box[1]+bb[1]-155,'advance':patch.width+2};glyphs['race'][ch]=entry;images.append((entry,patch))
for row in rows:
 if row['deckId']=='faerie':continue
 im=face(row);add_text(im,row['name'],(35,35,650,116),'title',100);add_text(im,str(row.get('cost','')),(670,35,740,108),'number',100)
zero=white(gremlin,(566,932,600,991));bb=zero.getbbox();zero=zero.crop(bb);entry={'width':zero.width,'height':zero.height,'dy':-zero.height,'advance':zero.width+2};glyphs['number']['0']=entry;images.append((entry,zero))
if '9' not in glyphs['number'] and '6' in glyphs['number']:
 six=glyphs['number']['6'];patch=next(p for entry,p in images if entry is six).transpose(Image.Transpose.ROTATE_180);entry=dict(six);glyphs['number']['9']=entry;images.append((entry,patch))
# Raster letters retain the exact Latin title shapes from the supplied cards.
atlas=Image.new('RGBA',(1024,1024));x=y=rowh=0
for entry,patch in images:
 if x+patch.width+2>1024:x=0;y+=rowh+3;rowh=0
 entry.update(x=x,y=y);atlas.alpha_composite(patch,(x,y));x+=patch.width+3;rowh=max(rowh,patch.height)
atlas.crop((0,0,1024,y+rowh+2)).save(OUT/'glyphs.png')
(APP/'src/card-glyphs.json').write_text(json.dumps(glyphs,ensure_ascii=False),encoding='utf8')
for row in faerie:
 if row['name'] not in aspects:continue
 im=face(row);patch=im.crop((40,123,141,225)).convert('RGBA');pixels=[]
 for yy in range(patch.height):
  for xx in range(patch.width):
   rr,g,b,a=patch.getpixel((xx,yy));rad=math.hypot(xx-50,yy-50)
   alpha=255 if rad<43 else max(0,min(255,round((min(rr,g,b)-130)*255/125))) if rad<51 else 0
   pixels.append((rr,g,b,alpha))
 patch.putdata(pixels);patch.save(OUT/(aspects[row['name']].lower()+'.png'))
white(gremlin,(48,978,105,1035)).save(OUT/'deck-faerie.png')
def black_crop(im,box,name):
 p=im.crop(box).convert('RGBA');p.putdata([(0,0,0,max(0,min(255,round((235-max(r,g,b))*255/190)))) for r,g,b,a in p.getdata()]);p.save(OUT/name)
black_crop(gremlin,(494,749,534,789),'influence.png')
tasha=face(next(r for r in faerie if r['name'].startswith('Tasha')))
black_crop(tasha,(106,720,145,760),'power.png')
# Isolate the original notched white inner-circle border; the editable number is drawn later.
ring=gremlin.crop((615,916,718,1020)).convert('RGBA');px=[]
for yy in range(ring.height):
 for xx in range(ring.width):
  r,g,b,a=ring.getpixel((xx,yy));rad=math.hypot(xx-51,yy-51)
  px.append((255,255,255,max(0,min(255,round((min(r,g,b)-130)*255/125))) if 37<rad<52 else 0))
ring.putdata(px);ring.save(OUT/'inner-ring.png')
gremlin.crop((47,167,722,683)).save(APP/'.preview/gremlin-art.png')
print({k:''.join(v) for k,v in glyphs.items()})
