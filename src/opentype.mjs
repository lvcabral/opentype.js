import { tinf_uncompress as inflate } from './tiny-inflate@1.0.3.esm.mjs';
import Font from './font.mjs';
import { getTag, getUShort, getULong } from './parse.mjs';
import head from './tables/head.mjs';
import hhea from './tables/hhea.mjs';
import nameTable from './tables/name.mjs';

function ensureArrayBuffer(buffer) {
    if (buffer instanceof ArrayBuffer) {
        return buffer;
    }
    if (ArrayBuffer.isView(buffer)) {
        return buffer.buffer;
    }
    if (buffer && buffer.buffer instanceof ArrayBuffer) {
        return buffer.buffer;
    }
    return new Uint8Array(buffer).buffer;
}

function parseOpenTypeTableEntries(data, numTables) {
    const entries = [];
    let offset = 12;
    for (let i = 0; i < numTables; i += 1) {
        const tag = getTag(data, offset);
        const checksum = getULong(data, offset + 4);
        const tableOffset = getULong(data, offset + 8);
        const length = getULong(data, offset + 12);
        entries.push({ tag, checksum, offset: tableOffset, length, compression: false });
        offset += 16;
    }
    return entries;
}

function parseWOFFTableEntries(data, numTables) {
    const entries = [];
    let offset = 44;
    for (let i = 0; i < numTables; i += 1) {
        const tag = getTag(data, offset);
        const tableOffset = getULong(data, offset + 4);
        const compLength = getULong(data, offset + 8);
        const origLength = getULong(data, offset + 12);
        const compression = compLength < origLength ? 'WOFF' : false;
        entries.push({ tag, offset: tableOffset, length: origLength, compression, compressedLength: compLength });
        offset += 20;
    }
    return entries;
}

function uncompressTable(data, entry) {
    if (entry.compression !== 'WOFF') {
        return { data, offset: entry.offset };
    }
    const inBuffer = new Uint8Array(data.buffer, entry.offset + 2, entry.compressedLength - 2);
    const outBuffer = new Uint8Array(entry.length);
    inflate(inBuffer, outBuffer);
    return { data: new DataView(outBuffer.buffer), offset: 0 };
}

export function parse(buffer) {
    const font = new Font();
    const view = new DataView(ensureArrayBuffer(buffer));
    const signature = getTag(view, 0);

    let tableEntries = [];
    let numTables = 0;
    if (signature === String.fromCharCode(0, 1, 0, 0) || signature === 'true' || signature === 'typ1') {
        numTables = getUShort(view, 4);
        tableEntries = parseOpenTypeTableEntries(view, numTables);
    } else if (signature === 'OTTO') {
        numTables = getUShort(view, 4);
        tableEntries = parseOpenTypeTableEntries(view, numTables);
    } else if (signature === 'wOFF') {
        const flavor = getTag(view, 4);
        if (flavor !== String.fromCharCode(0, 1, 0, 0) && flavor !== 'OTTO') {
            throw new Error('Unsupported OpenType flavor ' + flavor);
        }
        numTables = getUShort(view, 12);
        tableEntries = parseWOFFTableEntries(view, numTables);
    } else {
        throw new Error('Unsupported OpenType signature ' + signature);
    }

    let headTable;
    let hheaTable;
    let nameTableEntry;

    for (let i = 0; i < tableEntries.length; i += 1) {
        const entry = tableEntries[i];
        if (entry.tag === 'head') {
            const table = uncompressTable(view, entry);
            headTable = head.parse(table.data, table.offset);
            font.tables.head = headTable;
            font.unitsPerEm = headTable.unitsPerEm;
        } else if (entry.tag === 'hhea') {
            const table = uncompressTable(view, entry);
            hheaTable = hhea.parse(table.data, table.offset);
            font.tables.hhea = hheaTable;
            font.ascender = hheaTable.ascender;
            font.descender = hheaTable.descender;
        } else if (entry.tag === 'name') {
            nameTableEntry = entry;
        }
    }

    if (!font.tables.head || !font.tables.hhea) {
        throw new Error('Font is missing required head or hhea tables.');
    }

    if (nameTableEntry) {
        const table = uncompressTable(view, nameTableEntry);
        font.names = nameTable.parse(table.data, table.offset);
    }

    return font;
}

export { Font };
export default { parse, Font };
