"""Package the complete fonts from the user-supplied BGG creation kit.

Requires fontTools and brotli. The source programs, glyphs and embedding flags
are preserved; only the container changes to WOFF2. No scanned glyph assembly.
"""
import hashlib,json,sys
from pathlib import Path
APP=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(APP/'.preview/font-tools')]
from fontTools.ttLib import TTFont

KIT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'C:/Users/Vladislav/Desktop/deck for TYRANTS')
OUT=APP/'dist/assets/card-fonts';OUT.mkdir(parents=True,exist_ok=True)
FACES=[
 ('Modesto Condensed Bold.ttf','modesto-bold','TyrantsTitle',700,'normal'),
 ('Modesto Condensed Light.ttf','modesto-light','TyrantsCondensedLight',400,'normal'),
 ('Modesto Expanded.ttf','modesto-expanded','TyrantsExpanded',400,'normal'),
 ('ScalaSans-Regular.otf','scala-regular','TyrantsRules',400,'normal'),
 ('ScalaSans-RegularLFItalic.otf','scala-italic','TyrantsRules',400,'italic'),
 ('ScalaSans-BoldItalic.otf','scala-bold-italic','TyrantsRules',700,'italic'),
 ('ScalaSans-RegularLF.otf','scala-figures','TyrantsFigures',400,'normal'),
]
manifest={'source':'Tyrants_Card_Template.rar / Fonts',
 'template':'Tyrant_Card_Template.psd',
 'sourcePage':'https://boardgamegeek.com/filepage/207673/fan-deck-creation-kit-card-template-plus-fonts',
 'templateSHA256':hashlib.sha256((KIT/'Tyrant_Card_Template.psd').read_bytes()).hexdigest(),'fonts':[]}
css=['/* Complete source fonts from the supplied creation kit; card rendering only. */']
for filename,slug,family,weight,style in FACES:
 path=KIT/'Fonts'/filename;data=path.read_bytes();font=TTFont(path)
 cmap=font.getBestCmap();missing=[chr(n) for n in range(32,127) if n not in cmap]
 if missing:raise ValueError(f'{filename}: incomplete ASCII coverage {missing}')
 digest=hashlib.sha256(data).hexdigest();file=slug+'-'+digest[:10]+'.woff2'
 font.flavor='woff2';font.save(OUT/file)
 manifest['fonts'].append({'sourceFile':filename,'postScriptName':font['name'].getDebugName(6),
  'family':family,'weight':weight,'style':style,'file':file,'sourceSHA256':digest,
  'codepoints':sorted(cmap),'embeddingFlags':font['OS/2'].fsType})
 css.append(f'@font-face {{ font-family:{family}; src:url("{file}") format("woff2"); font-weight:{weight}; font-style:{style}; font-display:block; }}')
 print(filename,'->',file,'ASCII complete',len(cmap),'glyph mappings')
(OUT/'source-fonts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'source-fonts.css').write_text('\n'.join(css)+'\n',encoding='utf8')
