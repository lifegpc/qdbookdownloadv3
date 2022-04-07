function arrayBufferToHex(arrayBuffer) {
    if (typeof arrayBuffer !== 'object' || arrayBuffer === null || typeof arrayBuffer.byteLength !== 'number') {
        throw new TypeError('Expected input to be an ArrayBuffer')
    }

    var view = new Uint8Array(arrayBuffer)
    var result = ''
    var value

    for (var i = 0; i < view.length; i++) {
        value = view[i].toString(16)
        result += (value.length === 1 ? '0' + value : value)
    }

    return result
}

/**
 * Reads 4 bytes from array starting at offset as little-endian
 * unsigned 32-bit integer and returns it.
 * @param {Uint8Array} array 
 * @param {number} offset 
 * @return {number}
 */
function readUint32LE(array, offset = 0) {
    return ((array[offset + 3] << 24) |
        (array[offset + 2] << 16) |
        (array[offset + 1] << 8) |
        array[offset]) >>> 0;
}

/**
 * Writes 4-byte big-endian representation of 32-bit unsigned
 * value to byte array starting at offset.
 *
 * If byte array is not given, creates a new 4-byte one.
 *
 * Returns the output byte array.
 * @param {number} value 
 * @param {Uint8Array} out 
 * @param {number} offset 
 */
function writeUint32LE(value, out = new Uint8Array(4), offset = 0) {
    out[offset + 0] = value >>> 0;
    out[offset + 1] = value >>> 8;
    out[offset + 2] = value >>> 16;
    out[offset + 3] = value >>> 24;
    return out;
}

/**
 * Compare two arraies
 * @param {Uint8Array} arr1 
 * @param {Uint8Array} arr2 
 */
function u8arrcmp(arr1, arr2) {
    return arr1.length == arr2.length && arr1.every((v, i) => v === arr2[i]);
}

module.exports = { arrayBufferToHex, readUint32LE, writeUint32LE, u8arrcmp };
