"""Extract the supplied MINION back losslessly; never upscale a scanned copy."""

import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
sys.path[:0] = [
    str(ROOT / '.preview-checks/tyrants-pdf-stable'),
    str(ROOT / '.preview-checks/qa-python'),
]
import pymupdf as fitz
from PIL import Image


def prepare(source):
    output = APP / 'dist/assets'
    output.mkdir(parents=True, exist_ok=True)
    with fitz.open(source) as pdf:
        # Page 2 is the reverse sheet; extract its embedded image, not a page render.
        matches = [im for im in pdf[1].get_images(full=True) if im[2:4] == (822, 1122)]
        if len(matches) != 1:
            raise ValueError('Expected the single native 822 x 1122 MINION back on page 2.')
        asset = pdf.extract_image(matches[0][0])
    if asset['ext'] != 'png':
        raise ValueError('The embedded source must be a lossless PNG.')
    raw = asset['image']
    (output / 'minion-back-source.png').write_bytes(raw)
    original = Image.open(io.BytesIO(raw))
    # Remove 36px bleed at the sides, plus 5px of black trim at top/bottom
    # to match the editor's exact 750 x 1040 canvas. No resampling/stretching.
    crop_box = (36, 41, 786, 1081)
    printed = original.crop(crop_box)
    assert printed.size == (750, 1040)
    printed.save(output / 'minion-back-print.png', dpi=(750 * 25.4 / 63.5, 1040 * 25.4 / 88))
    metadata = {
        'source': 'User-supplied Faerie deck / Faerie 2.0.pdf',
        'page': 2,
        'extraction': 'Embedded lossless PNG, not a screenshot or scan enhancement',
        'sourcePixels': [822, 1122],
        'sourceSHA256': hashlib.sha256(raw).hexdigest(),
        'printPixels': [750, 1040],
        'cropBox': list(crop_box),
        'resampled': False,
        'pdfCardMillimetres': [63.5, 88],
        'bggReference': 'https://boardgamegeek.com/filepage/207673/fan-deck-creation-kit-card-template-plus-fonts',
        'bggNote': 'Reference kit only; the deployed image was extracted from the supplied PDF, not downloaded from BGG.',
    }
    (output / 'minion-back-source.json').write_text(
        json.dumps(metadata, indent=2) + '\n', encoding='utf-8'
    )
    print('MINION: native 822 x 1122 PNG; print crop 750 x 1040, no resampling.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', type=Path,
                        default=Path(r'C:/Users/Vladislav/Desktop/try to print/Faerie deck/Faerie 2.0.pdf'))
    prepare(parser.parse_args().source)
