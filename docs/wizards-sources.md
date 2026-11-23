# Wizards card support

The Arcane School artwork and Wizards deck mark were supplied by Marcos Otaviano,
the Wizards fan-deck author. These are original supplied images, not AI recreations.

The editor offers Abjuration, Necromancy, Illusion, Enchantment, Evocation,
Divination, Conjuration, Transmutation and Any Arcana. Selecting a school inserts
its icon and name. The name remains editable for translations. Clearing the name
hides the secondary aspect; existing cards without a school retain their layout.

The position and scale are based on the supplied Prodigious Novice Arcanist PSD:
796 × 1082 px; Arcane School layer bounds (642, 131)–(740, 229), school text bounds
(472, 175)–(642, 196). The editor maps the trimmed source into its 750 × 1040 canvas.
Both points fields accept ASCII `*`, including combinations such as `2*`.
The `*` buttons beside the points fields toggle the star without typing it.
The secondary-aspect presets are visible immediately, and the original Any Arcana
icon is the default for a named secondary aspect. A custom upload is optional.
The text-position slider moves only the school label, preserving its typeface
and icon position. Its value is saved in the project and used in print exports.

To reproduce the icons from the author's files, install Pillow and psd-tools and run:

```text
python scripts/prepare-wizard-schools.py "path/to/author/files"
```

The original PSDs are kept outside this public repository.

## Translation sources identified

- [Siege: English, German and Portuguese](https://boardgamegeek.com/filepage/193805/fan-expansion-siege-deck-engerpor)
- [Mercenaries: Brazilian Portuguese](https://boardgamegeek.com/filepage/318995)
- [Kuo-toa: Brazilian Portuguese](https://boardgamegeek.com/filepage/329731)
- [Author's Kuo-toa post and translation credits](https://boardgamegeek.com/thread/3424132/fan-deck-kuo-toa)

The post credits Marcos_Otaviano for the Mercenaries and Kuo-toa PT-BR translations.
BGG metadata confirms the Portuguese Siege file `Cerco_Deck.pdf` (file 286370).
Mercenaries and Siege show these translation/download pages in their library entries,
with Marcos's credit for Mercenaries. The links open BGG explicitly.
These source links do not mean the translated PDFs are bundled: downloads must be
retrieved and inspected before publishing a translated library version. English
assets must never be labelled as a translation.
