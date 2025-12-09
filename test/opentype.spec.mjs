import assert from 'assert';
import { readFileSync } from 'fs';
import { parse } from '../src/opentype.mjs';

function loadFont(relativePath) {
    return readFileSync(new URL(relativePath, import.meta.url));
}

describe('parse()', () => {
    it('extracts metadata from a TrueType font', () => {
        const font = parse(loadFont('./fonts/Roboto-Black.ttf'));
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.ascender, 1900);
        assert.equal(font.descender, -500);
        const family = font.names.fontFamily?.en;
        assert.equal(family, 'Roboto Black');
    });

    it('extracts metadata from a CFF OpenType font', () => {
        const font = parse(loadFont('./fonts/FiraSansOT-Medium.otf'));
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.tables.head.macStyle, 0);
        const version = font.names.version?.en;
        assert.ok(version?.startsWith('Version'));
    });

    it('handles WOFF containers', () => {
        const font = parse(loadFont('./fonts/FiraSansMedium.woff'));
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.tables.hhea.numberOfHMetrics, 1147);
    });
});
