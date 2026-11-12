"""Classify actual resources and preserve source document structure for readers."""
import io
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
sys.path[:0] = [str(ROOT / '.preview-checks/tyrants-pdf-stable'), str(ROOT / '.preview-checks/qa-python')]
import pymupdf as fitz
from PIL import Image

DIST = APP / 'dist'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'


def docx_blocks(file):
    with zipfile.ZipFile(file) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    blocks = []
    for paragraph in root.findall('.//w:body/w:p', NS):
        style = paragraph.find('w:pPr/w:pStyle', NS)
        style = style.get(W + 'val', '') if style is not None else ''
        # Word line breaks are actual structure, not incidental XML whitespace.
        # The Wizards document uses them instead of separate paragraphs.
        lines = [[]]
        for run in paragraph.findall('.//w:r', NS):
            props = run.find('w:rPr', NS)
            bold = props is not None and props.find('w:b', NS) is not None
            italic = props is not None and props.find('w:i', NS) is not None
            for node in run:
                if node.tag == W + 'br':
                    lines.append([])
                elif node.tag in [W + 't', W + 'tab']:
                    text = node.text or (' ' if node.tag == W + 'tab' else '')
                    lines[-1].append({'text': text, 'bold': bold, 'italic': italic})
        for runs in lines:
            text = ''.join(run['text'] for run in runs).strip()
            if not text:
                continue
            heading = style.lower().startswith('heading') or text in [
                'Deck innovations', 'Suggestions', 'Obedience Cards', 'Conquest Cards',
                'Guile Cards', 'Malice Cards', 'Ambition Cards', 'Cards v1.1', 'Sorted by Aspect:',
                'Decks Sorted by Arcane School:', 'Sorted by Arcane School:',
            ]
            list_item = paragraph.find('w:pPr/w:numPr', NS) is not None or bool(re.match(r'^[•●\-]\s', text))
            blocks.append({'type': 'heading' if heading else 'item' if list_item else 'paragraph',
                           'text': text, 'runs': runs})
    return blocks


def pdf_preview(source, page, name):
    target = DIST / 'assets/rules' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with fitz.open(source) as doc:
        p = doc[page - 1]
        pix = p.get_pixmap(matrix=fitz.Matrix(1400 / p.rect.width, 1400 / p.rect.width), alpha=False)
    image = Image.open(io.BytesIO(pix.tobytes('png')))
    image.save(target, 'WEBP', quality=94)
    return str(target.relative_to(DIST)).replace('\\', '/')


def card_cover(source, page, name, crop=None, clip=None):
    target = DIST / 'assets/library/covers' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with fitz.open(source) as doc:
        if clip:
            pix = doc[page - 1].get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(*clip), alpha=False)
            im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
        else:
            images = doc[page - 1].get_image_info(xrefs=True)
            first = images[0]
            raw = doc.extract_image(first['xref'])
            im = Image.open(io.BytesIO(raw['image'])).convert('RGB')
    if crop:
        im = im.crop(crop)
    im.thumbnail((650, 920), Image.Resampling.LANCZOS)
    im.save(target, 'WEBP', quality=94)
    return str(target.relative_to(DIST)).replace('\\', '/')


def curate():
    library = json.loads((DIST / 'library.json').read_text('utf-8'))
    library = [p for p in library if p['id'] != 'base-game']
    for pack in library:
        pack['rulesDocuments'] = []
        pack['cards'] = [c for c in pack['cards'] if not c.get('curated')]
        pack.pop('cover', None)
        for file in pack['files']:
            file['role'] = 'rules' if file['type'] == 'DOCX' or 'instructions' in file['name'].lower() else 'print'
            if file['type'] == 'DOCX':
                blocks = docx_blocks(DIST / file['url'])
                pack['rulesDocuments'].append({
                    'id': pack['id'] + '-rules', 'title': pack['title'], 'language': 'en',
                    'format': 'article', 'sourceUrl': file['url'], 'sourceName': file['name'],
                    'blocks': blocks,
                })
        if pack['id'] == 'cohort':
            for page in pack['pages']:
                page['kind'] = 'rules' if page['page'] == 1 else 'back-sheet' if page['page'] % 2 else 'card-sheet'
                page['name'] = 'Cohorts — ' + ('rules' if page['page'] == 1 else 'card backs' if page['page'] % 2 else 'cards') + ' · ' + str(page['page'])
            pack['cover'] = card_cover(DIST / pack['files'][0]['url'], 2, 'cohorts.webp')
            pack['rulesDocuments'].append({
                'id': 'cohort-rules', 'title': 'Cohorts', 'language': 'en', 'format': 'pages',
                'sourceUrl': pack['files'][0]['url'], 'sourceName': pack['files'][0]['name'],
                'pages': [pdf_preview(DIST / pack['files'][0]['url'], 1, 'cohorts-rules.webp')],
            })
        elif pack['id'] == 'svirfneblin':
            for page in pack['pages']:
                page['kind'] = 'back-sheet' if 'card-backs' in page['sourceFile'] else 'card-sheet'
                page['name'] = 'MINION — print sheet' if page['kind'] == 'back-sheet' else 'Svirfneblin & Kuo-Toa — update cards · ' + ('1' if 'printsheet01' in page['id'] else '2')
            # The PDF embeds horizontal strips, splitting cards across images.
            # Render the complete first card across those strips, not one image.
            pack['cover'] = card_cover(DIST / pack['files'][0]['url'], 1, 'svirfneblin.webp', clip=(17.2, 35.4, 199.9, 288.6))
        elif pack['id'] == 'sites':
            for page in pack['pages']:
                page['kind'] = 'rules' if 'instructions' in page['sourceFile'] else 'token'
                page['name'] = 'Sites of Power — ' + ('rules' if page['kind'] == 'rules' else 'token fronts' if page['page'] == 1 else 'token reverses')
            instruction = next(f for f in pack['files'] if f['role'] == 'rules')
            pack['rulesDocuments'].append({
                'id': 'sites-rules', 'title': 'Sites of Power', 'language': 'en', 'format': 'pages',
                'sourceUrl': instruction['url'], 'sourceName': instruction['name'],
                'pages': [pdf_preview(DIST / instruction['url'], 1, 'sites-rules.webp')],
            })
        elif pack['id'] == 'demonweb':
            for page in pack['pages']:
                page['kind'] = 'rules' if page['page'] <= 2 else 'board'
                page['name'] = 'Demonweb 2.2 — ' + ('rules' if page['page'] == 1 else 'setup diagrams' if page['page'] == 2 else 'map tiles · ' + str(page['page'] - 2))
            pack['cover'] = pack['pages'][6]['image']
            pack['rulesDocuments'].append({
                'id': 'demonweb-rules', 'title': 'Demonweb 2.2', 'language': 'en', 'format': 'pages',
                'sourceUrl': pack['files'][0]['url'], 'sourceName': pack['files'][0]['name'],
                'pages': [pdf_preview(DIST / pack['files'][0]['url'], n, 'demonweb-rules-' + str(n) + '.webp') for n in [1, 2]],
            })
        elif pack['id'] == 'houses':
            names = ['Agrach Dyrr', 'Baenre', "Barrison Del’Armgo", "Do’Urden", "Faen Tlabbar", 'Fey-Branche', 'Fey-Branche — alternative', 'Melarn', 'Mizzrym', 'Nasadra', "Hun’ett", 'Xorlarrin']
            for page, name in zip(pack['pages'], names):
                page['name'] = name
        elif pack['id'] == 'mercenaries':
            pack['rulesDocuments'].append({
                'id': 'mercenaries-rules', 'title': 'Mercenaries', 'language': 'en', 'format': 'pages',
                'sourceUrl': pack['files'][0]['url'], 'sourceName': pack['files'][0]['name'],
                'pages': [pdf_preview(DIST / pack['files'][0]['url'], 1, 'mercenaries-rules.webp')],
            })
        elif pack['id'] == 'ooze':
            reference = next((c for c in pack['cards'] if c['kind'] == 'reference'), None)
            if reference:
                pack['rulesDocuments'].append({
                    'id': 'ooze-reference', 'title': 'Ooze — reference card', 'language': 'en',
                    'format': 'pages', 'sourceUrl': reference['image'], 'sourceName': 'Ooze reference card',
                    'pages': [reference['image']],
                })
        if pack['id'] in ['faerie', 'cohort', 'svirfneblin']:
            source = pack['files'][0] if pack['id'] != 'svirfneblin' else next(f for f in pack['files'] if 'card-backs' in f['url'])
            pack['cards'].append({
                'id': pack['id'] + '-minion-back', 'name': 'MINION', 'kind': 'back',
                'image': 'assets/minion-back-print.png', 'curated': True,
                'sourceFile': source['url'], 'page': 2 if pack['id'] == 'faerie' else 3 if pack['id'] == 'cohort' else 1,
            })
        # Covers are front-facing components only. Rule sheets and card backs
        # never become a deck cover simply because they occur first in a PDF.
        if not pack.get('cover'):
            cover = next((c for c in pack['cards'] if c['kind'] == 'market'), None)
            cover = cover or next((c for c in pack['pages'] if c['kind'] in ['board', 'mat', 'token', 'card-sheet']), None)
            pack['cover'] = cover['image'] if cover else ''
        pack['rules'] = ''  # Replaced by structured, explicitly classified documents.
    library.insert(0, {
        'id': 'base-game', 'title': 'Tyrants of the Underdark', 'subtitle': 'Правила базової гри',
        'category': 'rules', 'cards': [], 'pages': [], 'files': [], 'rules': '', 'note': '', 'cover': '',
        'rulesDocuments': [{
            'id': 'base-game-rules', 'title': 'Tyrants of the Underdark — Rulebook', 'language': 'en',
            'format': 'pdf', 'sourceName': 'Tyrants of the Underdark — original rulebook',
            'sourceUrl': 'https://cdn.1j1ju.com/medias/6c/f4/36-tyrants-of-the-underdark-board-game-rulebook.pdf',
            'publisherUrl': 'https://dnd.gf9games.com/images/Products/TOTU/TyrantsOfTheUnderdark-Rulebook.pdf',
        }],
    })
    (DIST / 'library.json').write_text(json.dumps(library, ensure_ascii=False), encoding='utf-8')
    from runpy import run_path
    run_path(str(APP / 'scripts/prepare-player-boards.py'))['prepare']()
    run_path(str(APP / 'scripts/prepare-deck-guides.py'))['prepare']()
    prepared = json.loads((DIST / 'library.json').read_text('utf-8'))
    print('Curated library:', len(prepared), 'packs,', sum(len(p['rulesDocuments']) for p in prepared), 'rule documents and references.')


if __name__ == '__main__':
    curate()
