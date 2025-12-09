import { argument } from './check.mjs';

export function getTag(dataView, offset) {
    let tag = '';
    for (let i = 0; i < 4; i += 1) {
        tag += String.fromCharCode(dataView.getInt8(offset + i));
    }
    return tag;
}

export function getUShort(dataView, offset) {
    return dataView.getUint16(offset, false);
}

export function getULong(dataView, offset) {
    return dataView.getUint32(offset, false);
}

function getFixed(dataView, offset) {
    const integer = dataView.getInt16(offset, false);
    const fraction = dataView.getUint16(offset + 2, false);
    return integer + fraction / 65536;
}

export class Parser {
    constructor(data, offset) {
        this.data = data;
        this.offset = offset;
        this.relativeOffset = 0;
    }

    parseUShort() {
        const value = this.data.getUint16(this.offset + this.relativeOffset, false);
        this.relativeOffset += 2;
        return value;
    }

    parseULong() {
        const value = this.data.getUint32(this.offset + this.relativeOffset, false);
        this.relativeOffset += 4;
        return value;
    }

    parseShort() {
        const value = this.data.getInt16(this.offset + this.relativeOffset, false);
        this.relativeOffset += 2;
        return value;
    }

    parseFixed() {
        const value = getFixed(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return value;
    }

    parseVersion(minorBase = 0x1000) {
        const major = this.parseUShort();
        const minor = this.parseUShort();
        return major + minor / minorBase / 10;
    }

    parseLongDateTime() {
        this.parseULong();
        const low = this.parseULong();
        return low - 2082844800;
    }

    parseString(length) {
        let result = '';
        const start = this.offset + this.relativeOffset;
        for (let i = 0; i < length; i += 1) {
            result += String.fromCharCode(this.data.getUint8(start + i));
        }
        this.relativeOffset += length;
        return result;
    }
}

export function ensure(condition, message) {
    argument(condition, message);
}
