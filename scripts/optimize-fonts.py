"""Optional offline asset maintenance; Python is not needed to build or run the site.

Requires fonttools[woff] (including Brotli). Keeps every existing glyph/subset,
pins the editorial optical-size axis at its original default, and retains the
400..700 weight range actually declared by fonts.css. The OFL notices remain.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent / 'frontend-vercel/assets/fonts'
for index in range(12):
    file = root / f'editorial-{index}.woff2'
    original_size = file.stat().st_size
    font = TTFont(file, recalcTimestamp=False)
    axes = {axis.axisTag for axis in font['fvar'].axes}
    limits = {'wght': (400, 700)}
    if 'opsz' in axes:
        limits['opsz'] = 20
    font = instantiateVariableFont(font, limits, inplace=True)
    family = 'Buxara Sans' if index < 4 else 'Buxara Editorial'
    style = 'Italic' if 4 <= index < 8 else 'Regular'
    ps = family.replace(' ', '')
    names = {1: family, 2: style, 3: ps + '-Variable-' + style,
             4: family + ' ' + style, 6: ps + '-' + style,
             16: family, 17: style, 25: ps + style}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
        elif record.nameID >= 256:
            value = record.toUnicode().replace('Source Serif 4', family)
            value = value.replace('SourceSerif4', ps).replace('Manrope', ps)
            record.string = value.encode(record.getEncoding())
    font.save(file)
    print(f'{file.name}: {original_size} -> {file.stat().st_size} bytes')
