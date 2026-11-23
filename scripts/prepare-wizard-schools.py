"""Extract Marcos's supplied school artwork without redrawing the symbols.

Usage: python scripts/prepare-wizard-schools.py <folder containing the PSDs and PNGs>
Requires Pillow and psd-tools. Original source files remain outside the repository.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.preview/psd-tools'))
from PIL import Image
from psd_tools import PSDImage

source = Path(sys.argv[1])
out = ROOT / 'dist/assets/arcane-schools'
out.mkdir(parents=True, exist_ok=True)
sheet = Image.open(source / 'Arcane Schools symbols - Copia.png').convert('RGBA')
boxes = {
    'abjuration': (29, 25, 212, 211),
    'necromancy': (289, 28, 475, 212),
    'illusion': (550, 28, 738, 214),
    'enchantment': (817, 33, 1006, 222),
    'evocation': (29, 314, 216, 499),
    'divination': (283, 302, 474, 493),
    'conjuration': (540, 292, 735, 481),
    'transmutation': (794, 302, 985, 495),
    'any': (1048, 143, 1233, 328),
}
for name, box in boxes.items():
    image = sheet.crop(box)
    # Remove only the purple sheet background, retaining the black discs and white rims.
    image.putdata([(r, g, b, 0 if b > g * 1.5 and b > r * 1.25 else a)
                   for r, g, b, a in image.getdata()])
    image.crop(image.getbbox()).save(out / f'{name}.png')

deck = Image.open(source / 'Wizard deck Icon.png').convert('RGBA')
# The supplied deck mark has a black backdrop; the mark itself is white.
deck.putdata([(255, 255, 255, min(r, g, b) * a // 255)
              for r, g, b, a in deck.getdata()])
deck.crop(deck.getbbox()).save(ROOT / 'dist/assets/deck-marks/wizards.png')

report = []
for file in sorted(source.glob('*.psd')):
    psd = PSDImage.open(file)
    layers = [{ 'name': layer.name, 'box': list(layer.bbox),
                'text': getattr(layer, 'text', '') }
              for layer in psd.descendants()
              if layer.name in ('School', 'Type', 'Arcane School', 'Deck VP', 'InnerCircle Vp')]
    report.append({'file': file.name, 'size': list(psd.size), 'layers': layers})
import json
(ROOT / '.preview/wizard-psd-measurements.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(f'Prepared {len(boxes)} original school icons and Wizards deck mark; measured {len(report)} PSDs.')
