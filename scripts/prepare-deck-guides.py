"""Build local, attributed deck references for packs without a separate rulebook.

The references are kept distinct from original author documents. Their source
notes and card examples live in content/deck-guides.json for editorial review.
"""
import json
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP.parent / '.preview-checks/tyrants-pdf-stable'))
import pymupdf as fitz


def prepare():
    dist = APP / 'dist'
    source = json.loads((APP / 'content/deck-guides.json').read_text('utf-8'))
    library_path = dist / 'library.json'
    library = json.loads(library_path.read_text('utf-8'))
    purple, ink, muted = (0.20, 0.12, 0.31), (0.12, 0.10, 0.15), (0.36, 0.33, 0.40)
    for guide in source:
        pack = next(pack for pack in library if pack['id'] == guide['pack'])
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        page.draw_rect(fitz.Rect(20, 20, 575, 822), color=purple, width=1.2)
        page.draw_rect(fitz.Rect(20, 20, 575, 144), color=purple, fill=purple)
        page.insert_text((42, 49), 'TYRANTS OF THE UNDERDARK', fontname='hebo', fontsize=10, color=(.83, .75, .93))
        page.insert_text((42, 88), guide['title'], fontname='tibo', fontsize=29, color=(1, 1, 1))
        page.insert_text((42, 117), guide['edition'].replace('\u2022', '|'), fontname='helv', fontsize=10, color=(.90, .85, .96))
        y = 171
        for section in guide['sections']:
            page.insert_text((42, y), section['heading'], fontname='hebo', fontsize=12, color=purple)
            y += 10
            remaining = page.insert_textbox(fitz.Rect(42, y, 553, 735), section['text'],
                                            fontname='helv', fontsize=11, lineheight=1.45, color=ink)
            if remaining < 0:
                raise ValueError('Guide text overflows: ' + guide['pack'])
            y = 735 - remaining + 22
        if y > 746:
            raise ValueError('Guide footer overlaps: ' + guide['pack'])
        page.draw_line((42, 758), (553, 758), color=(.8, .76, .85))
        if page.insert_textbox(fitz.Rect(42, 768, 553, 799), guide['sourceNote'],
                               fontname='helv', fontsize=8, lineheight=1.3, color=muted) < 0:
            raise ValueError('Source note overflows')
        page.insert_text((42, 810), guide['authorUrl'], fontname='helv', fontsize=8, color=purple)
        page.insert_link({'kind': fitz.LINK_URI, 'from': fitz.Rect(42, 800, 350, 814), 'uri': guide['authorUrl']})
        pdf = dist / 'assets/rules' / (guide['pack'] + '-guide.pdf')
        preview = pdf.with_suffix('.png')
        doc.save(pdf, garbage=4, deflate=True, no_new_id=True)
        page.get_pixmap(matrix=fitz.Matrix(1600 / 595, 1600 / 595), alpha=False).save(preview)
        doc.close()
        pack['rulesDocuments'] = [{
            'id': guide['pack'] + '-rules', 'title': guide['title'], 'language': 'en',
            'format': 'pages', 'sourceKind': 'guide',
            'sourceUrl': pdf.relative_to(dist).as_posix(), 'sourceName': pdf.name,
            'authorUrl': guide['authorUrl'], 'sourceNote': guide['sourceNote'],
            'pages': [preview.relative_to(dist).as_posix()],
        }]
    library_path.write_text(json.dumps(library, ensure_ascii=False), encoding='utf-8')
    print('Prepared', len(source), 'local deck reference readers.')


if __name__ == '__main__':
    prepare()
