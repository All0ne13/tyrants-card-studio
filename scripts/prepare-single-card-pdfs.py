"""Prepare print-shop PDFs from the two decks supplied only as print sheets.

Requires PyMuPDF (pip install pymupdf). Original PDFs stay unchanged.
Cohorts includes both sets of ten cards from the author's PDF.
"""
import json
from pathlib import Path
import pymupdf as fitz

DIST = Path(__file__).resolve().parents[1] / 'dist'
manifest = DIST / 'library.json'
library = json.loads(manifest.read_text('utf8'))
SIZE = (63.5 * 72 / 25.4, 88 * 72 / 25.4)


def add_side(pdf, source=None, page=None, clip=None, image=None):
    target = pdf.new_page(width=SIZE[0], height=SIZE[1])
    target.draw_rect(target.rect, color=None, fill=(0, 0, 0))
    if image:
        target.insert_image(target.rect, filename=str(image), keep_proportion=True)
    else:
        target.show_pdf_page(target.rect, source, page, clip=clip, keep_proportion=True)


def sheet_cards(source):
    """Find each full card inside a known 3-by-3 sheet, including its border.

    Detection uses the high-resolution PDF, not the small library preview.
    Cell boundaries fall in the white gutters between the cards.
    """
    page = source[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixels = pix.samples
    for row, (top, bottom) in enumerate([(0, 292), (292, 549.5), (549.5, page.rect.height)]):
        for col in range(3):
            columns = [0, 202.75, 392, page.rect.width]
            left, right = columns[col], columns[col + 1]
            x0, y0, x1, y1 = pix.width, pix.height, 0, 0
            for y in range(int(top * 2), min(pix.height, int(bottom * 2))):
                for x in range(int(left * 2), min(pix.width, int(right * 2))):
                    at = (y * pix.width + x) * pix.n
                    if min(pixels[at:at + 3]) < 220:
                        x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x + 1), max(y1, y + 1)
            if x1 <= x0 or y1 <= y0:
                continue
            rect = fitz.Rect(x0 / 2, y0 / 2, x1 / 2, y1 / 2)
            if not 0.69 < rect.width / rect.height < 0.75:
                raise ValueError(f'Unexpected card bounds: {rect}')
            yield (source, 0, rect)


for pack in library:
    if pack['id'] not in ['cohort', 'svirfneblin']:
        continue
    sources = []
    faces = []
    if pack['id'] == 'cohort':
        source = fitz.open(DIST / pack['files'][0]['url'])
        sources.append(source)
        # The author provides 10 original cards, then 10 alternative versions.
        for page, count in [(1, 6), (3, 4), (5, 6), (7, 4)]:
            for slot in range(count):
                x, y = 109.5 + (slot % 3) * 191, 46.32 + (slot // 3) * 260
                faces.append((source, page, fitz.Rect(x, y, x + 191.04, y + 259.68)))
    else:
        for file in pack['files'][:2]:
            source = fitz.open(DIST / file['url'])
            sources.append(source)
            faces.extend(sheet_cards(source))
    back = DIST / next(card['image'] for card in pack['cards'] if card['kind'] == 'back')
    assert len(faces) == (20 if pack['id'] == 'cohort' else 10), 'Source card count changed'
    pack['singleCardFiles'] = {}
    pack['singleCardCount'] = len(faces)
    for duplex in [False, True]:
        pdf = fitz.open()
        for source, page, clip in faces:
            add_side(pdf, source, page, clip)
            if duplex:
                add_side(pdf, image=back)
        pdf.set_metadata({'title': pack['title'] + ' — single cards',
                          'subject': 'One 63.5 x 88 mm card side per page. Actual size / 100%.'})
        name = f"assets/library/{pack['id']}/{pack['id']}-single-{'duplex' if duplex else 'fronts'}.pdf"
        pdf.save(DIST / name, garbage=4, deflate=True)
        pack['singleCardFiles']['duplex' if duplex else 'fronts'] = name
        pdf.close()
    for source in sources:
        source.close()
    print(f"{pack['id']}: {len(faces)} card fronts, alternating backs, {SIZE[0]:.3f} x {SIZE[1]:.3f} pt")
manifest.write_text(json.dumps(library, ensure_ascii=False), 'utf8')
