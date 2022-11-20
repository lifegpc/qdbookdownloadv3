let T0 = undefined;
let TT = undefined;

function signed_crc_table() {
    var c = 0, table = new Array(256);

    for (var n = 0; n != 256; ++n) {
        c = n;
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
        table[n] = c;
    }

    return new Int32Array(table);
}

function slice_by_16_tables(T) {
    var c = 0, v = 0, n = 0, table = new Int32Array(4096);
    for (n = 0; n != 256; ++n) table[n] = T[n];
    for (n = 0; n != 256; ++n) {
        v = T[n];
        for (c = 256 + n; c < 4096; c += 256) v = table[c] = (v >>> 8) ^ T[v & 0xFF];
    }
    var out = [];
    for (n = 1; n != 16; ++n) out[n - 1] = table.subarray(n * 256, n * 256 + 256);
    return out;
}

/**@returns {Int32Array} */
function get_T0() {
    if (T0 === undefined) {
        T0 = signed_crc_table();
    }
    return T0;
}

/**@returns {Array<Int32Array>} */
function get_TT() {
    if (TT === undefined) {
        TT = slice_by_16_tables(get_T0());
    }
    return TT;
}

/**
 * Calculate the CRC32 of data
 * @param {Uint8Array} B data
 * @param {number} seed Seed
 * @returns 
 */
function hash(B, seed = 0) {
    let T0 = get_T0();
    let TT = get_TT();
    var C = seed ^ -1, L = B.length - 15, i = 0;
    for (; i < L;) C =
        TT[14][B[i++] ^ (C & 255)] ^
        TT[13][B[i++] ^ ((C >> 8) & 255)] ^
        TT[12][B[i++] ^ ((C >> 16) & 255)] ^
        TT[11][B[i++] ^ (C >>> 24)] ^
        TT[10][B[i++]] ^ TT[9][B[i++]] ^ TT[8][B[i++]] ^ TT[7][B[i++]] ^
        TT[6][B[i++]] ^ TT[5][B[i++]] ^ TT[4][B[i++]] ^ TT[3][B[i++]] ^
        TT[2][B[i++]] ^ TT[1][B[i++]] ^ TT[0][B[i++]] ^ T0[B[i++]];
    L += 15;
    while (i < L) C = (C >>> 8) ^ T0[(C ^ B[i++]) & 0xFF];
    return ~C;
}

module.exports = hash;
