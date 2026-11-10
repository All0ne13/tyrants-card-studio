import sys,json,re,shutil,io,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'.preview-checks/tyrants-pdf-stable'),str(ROOT/'.preview-checks/qa-python')]
import pymupdf as fitz
from PIL import Image
APP=ROOT/'tyrants-card-studio';OUT=APP/'dist/assets';SOURCE=Path(r'C:/Users/Vladislav/Desktop/try to print');PREP=ROOT/'.preview-checks/tyrants-expansion-prepared'
OUT.mkdir(parents=True,exist_ok=True)
PACKS={
 'faerie':('Faerie','Феї','Faerie deck','decks'),
 'mercenaries':('Mercenaries','Найманці','Mercenaries','decks'),
 'siege':('Siege','Облога','SIEGE deck','decks'),
 'ooze':('Ooze','Слизи','Ooze Deck card','decks'),
 'wizards':('Wizards','Чарівники','дека для тиранов(визарды)','decks'),
 'jaezred':('Jaezred Chaulssin','Джезред Чаульссін','Jaezred Chaulssin','decks'),
 'delver':("The Delver’s Company",'Компанія шукачів',"Delver's Company",'decks'),
 'cohort':('Cohort','Когорти','Cohorst','decks'),
 'svirfneblin':('Svirfneblin & Kuo-Toa','Свірфнебліни та куо-тоа','KUO-TOA+SVIRFNEBLIN','decks'),
 'sites':('Sites of Power','Місця сили','sites of power','boards'),
 'demonweb':('Demonweb 2.2','Модульне поле','modular board','boards'),
 'houses':('Custom Player Boards 1.9','Планшети домів','новые дома(планшеты)','mats')}
rows=json.loads((PREP/'cards.json').read_text('utf8'));manifest=[]
def slug(v):return re.sub(r'[^a-z0-9]+','-',v.lower()).strip('-') or 'resource'
def image_save(im,path,width=1050):
 im=im.convert('RGB');im.thumbnail((width,round(width*2.0)),Image.Resampling.LANCZOS);path.parent.mkdir(parents=True,exist_ok=True);im.save(path,'WEBP',quality=93)
for pack_id,(title,uk,folder,category) in PACKS.items():
 target=OUT/'library'/pack_id;target.mkdir(parents=True,exist_ok=True)
 pack={'id':pack_id,'title':title,'subtitle':uk,'category':category,'cards':[],'files':[],'pages':[],'rules':'','note':''}
 if pack_id=='svirfneblin':pack['note']='У джерелі є аркуші оновлення V1.0 → V1.1, а не повні базові колоди.'
 if pack_id=='delver':pack['note']='Містить основні карти, скарби й сталкерів. Кількість копій у вихідних файлах і правилах відрізняється — каталог зберігає надані матеріали.'
 for row in rows:
  if row['deckId']!=pack_id:continue
  name=slug(row['cardId']);source=PREP/row['originalAsset'];source=source if source.exists() else PREP/row['asset'];dest=target/(name+'.webp');image_save(Image.open(source),dest)
  pack['cards'].append({'id':row['cardId'],'name':row['name'],'image':str(dest.relative_to(APP/'dist')).replace('\\','/'),'kind':row['kind'],'cost':row.get('cost'),'deckVP':row.get('deckVP'),'innerVP':row.get('innerVP'),'copies':row.get('multiplicity'),'sourcePage':row.get('page')})
 # Existing extracted backs and update images are included independently of market-card metadata.
 known={r['originalAsset'] for r in rows if r['deckId']==pack_id}
 dirs=[PREP/pack_id] if pack_id!='svirfneblin' else [PREP/'svirfneblin-updates',PREP/'kuo-toa-updates']
 for d in dirs:
  if not d.exists():continue
  for file in d.glob('*.png'):
   if str(file.relative_to(PREP)).replace('\\','/') in known:continue
   if not ('back' in file.stem.lower() or pack_id=='svirfneblin'):continue
   dest=target/(slug(file.stem)+'.webp');image_save(Image.open(file),dest)
   pack['cards'].append({'id':pack_id+'-'+slug(file.stem),'name':'Сорочка' if 'back' in file.stem.lower() else file.stem,'image':str(dest.relative_to(APP/'dist')).replace('\\','/'),'kind':'back' if 'back' in file.stem.lower() else 'update'})
 for index,file in enumerate(sorted((SOURCE/folder).rglob('*'))):
  if file.suffix.lower()=='.pdf':
   doc=fitz.open(file);dest=target/(slug(file.stem)+'.pdf')
   # Keep vector text/page sizes, reduce oversized raster artwork to print resolution.
   try:doc.rewrite_images(dpi_threshold=360,dpi_target=300,quality=90)
   except Exception:pass
   doc.save(dest,garbage=4,deflate=True)
   pack['files'].append({'name':file.name,'url':str(dest.relative_to(APP/'dist')).replace('\\','/'),'type':'PDF','pages':len(doc),'size':dest.stat().st_size})
   if pack_id in ['cohort','sites','demonweb','houses','svirfneblin']:
    for pi,page in enumerate(doc):
     thumb=target/(slug(file.stem)+f'-page-{pi+1}.webp');pix=page.get_pixmap(matrix=fitz.Matrix(min(1.8,1050/page.rect.width),min(1.8,1050/page.rect.width)),alpha=False);im=Image.open(io.BytesIO(pix.tobytes('png')));image_save(im,thumb,1050)
     kind='mat' if pack_id=='houses' else 'board' if pack_id in ['sites','demonweb'] else 'sheet'
     if 'back' in file.stem.lower():kind='back'
     pack['pages'].append({'id':slug(file.stem)+f'-{pi+1}','name':f'{file.stem} · {pi+1}','image':str(thumb.relative_to(APP/'dist')).replace('\\','/'),'kind':kind,'sourceFile':str(dest.relative_to(APP/'dist')).replace('\\','/'),'page':pi+1})
   if pack_id=='cohort':pack['rules']+='\n'+doc[0].get_text()
   doc.close()
  elif file.suffix.lower()=='.docx':
   dest=target/file.name;shutil.copy2(file,dest);pack['files'].append({'name':file.name,'url':str(dest.relative_to(APP/'dist')).replace('\\','/'),'type':'DOCX','size':dest.stat().st_size})
   with zipfile.ZipFile(file) as z:
    root=ET.fromstring(z.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    pack['rules']+='\n'+'\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p',ns))
 # ZIP-based packs: provide every supplied image via a named source archive, not fabricated sheets.
 if pack_id in ['ooze','wizards']:
  for file in (SOURCE/folder).glob('*.zip'):
   dest=target/(pack_id+'-source.zip');shutil.copy2(file,dest);pack['files'].append({'name':file.name,'url':str(dest.relative_to(APP/'dist')).replace('\\','/'),'type':'ZIP','size':dest.stat().st_size})
 manifest.append(pack)
 print(pack_id,len(pack['cards']),len(pack['pages']),flush=True)
 # Release memory before next large scanned PDF.
(APP/'dist/library.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf8')
from runpy import run_path
run_path(str(APP/'scripts/prepare-minion-back.py'))['prepare'](SOURCE/'Faerie deck/Faerie 2.0.pdf')
for name in ['manrope-latin.woff2','manrope-cyrillic.woff2','Manrope-LICENSE.txt']:shutil.copy2(ROOT/'tyrants-underdark/dist/assets'/name,OUT/name)
print('Library prepared:',sum(len(p['cards']) for p in manifest),'cards,',sum(len(p['pages']) for p in manifest),'sheets/pages',flush=True)
