"""Keep lightweight library thumbnails and extract native-resolution player boards."""
import json
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP.parent / '.preview-checks/tyrants-pdf-stable'))
import pymupdf as fitz


def prepare():
    manifest = APP / 'dist/library.json'
    library = json.loads(manifest.read_text('utf-8'))
    pack = next(p for p in library if p['id'] == 'houses')
    output = APP / 'dist/assets/library/houses/full'
    output.mkdir(exist_ok=True)
    with fitz.open(APP / 'dist' / pack['files'][0]['url']) as doc:
        for asset in pack['pages']:
            page = doc[asset['page'] - 1]
            images = page.get_image_info(xrefs=True)
            image = max(images, key=lambda i: i['width'] * i['height'])
            native = doc.extract_image(image['xref'])
            target = output / f"player-board-{asset['page']}.{native['ext']}"
            target.write_bytes(native['image'])
            asset.update(fullImage=target.relative_to(APP / 'dist').as_posix(),
                         width=native['width'], height=native['height'])
    manifest.write_text(json.dumps(library, ensure_ascii=False), encoding='utf-8')
    print('Prepared', len(pack['pages']), 'native-resolution player boards.')


if __name__ == '__main__':
    prepare()
