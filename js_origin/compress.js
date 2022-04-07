const zlib = require('./_zlib');

let zlib_initalized = false;

zlib['onRuntimeInitialized'] = () => {
    console.log('zlib version:', zlib.version());
    zlib_initalized = true;
}

/**
 * @returns {Promise<void>}
 */
function make_sure_is_initialized() {
    return new Promise((resolve, reject) => {
        function f() {
            if (zlib_initalized) {
                resolve();
            } else {
                setTimeout(f, 1);
            }
        }
        f();
    })
}

/**
 * @param {Uint8Array} bytes
 * @param {number} level
 * @returns {Uint8Array}
 */
function tcompress(bytes, level) {
    let malloc = zlib['_malloc'];
    let free = zlib['_free'];
    /**@type {Uint32Array}*/
    let HEAPU32 = zlib['HEAPU32'];
    /**@type {Uint8Array} */
    let HEAPU8 = zlib['HEAPU8'];
    let ptr = malloc(8);
    if (ptr == null) {
        throw new Error('No enough memory.');
    }
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    HEAPU32[ptr >> 2] = 0;
    let len_ptr = ptr + 4;
    HEAPU32[len_ptr >> 2] = 0;
    let source_ptr = malloc(bytes.length);
    if (source_ptr == null) {
        free(ptr);
        throw new Error('No enough memory.');
    }
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    HEAPU8.set(bytes, source_ptr);
    let re = level == undefined ? zlib['_comp'](ptr, len_ptr, source_ptr, bytes.length) : zlib['_comp2'](ptr, len_ptr, source_ptr, bytes.length, level);
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    if (!re) {
        free(source_ptr);
        let arr = new Uint8Array(HEAPU32[len_ptr >> 2]);
        let tptr = HEAPU32[ptr >> 2];
        arr.set(HEAPU8.subarray(tptr, tptr + arr.length));
        free(tptr);
        free(ptr);
        return arr;
    }
    let tptr = HEAPU32[ptr >> 2];
    if (tptr) free(tptr);
    free(source_ptr);
    free(ptr);
    throw new Error(zlib.get_errmsg(re));
}

/**
 * @param {Uint8Array} bytes 
 * @param {number} length The length of uncompressed data.
 */
function tuncompress(bytes, length) {
    let malloc = zlib['_malloc'];
    let free = zlib['_free'];
    /**@type {Uint32Array}*/
    let HEAPU32 = zlib['HEAPU32'];
    /**@type {Uint8Array} */
    let HEAPU8 = zlib['HEAPU8'];
    /**Store destLen */
    let ptr = malloc(8);
    if (ptr == null) {
        throw new Error('No enough memory.');
    }
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    HEAPU32[ptr >> 2] = length;
    /**Store sourceLen */
    let srcLen_ptr = ptr + 4;
    HEAPU32[srcLen_ptr >> 2] = bytes.length;
    /**Store source*/
    let src_ptr = malloc(bytes.length);
    if (src_ptr == null) {
        free(ptr);
        throw new Error('No enough memory.');
    }
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    HEAPU8.set(bytes, src_ptr);
    /**Store dest*/
    let dest_ptr = malloc(length);
    if (dest_ptr == null) {
        free(src_ptr);
        free(ptr);
        throw new Error('No enough memory.');
    }
    let re = zlib['_uncompress2'](dest_ptr, ptr, src_ptr, srcLen_ptr);
    HEAPU32 = zlib['HEAPU32'];
    HEAPU8 = zlib['HEAPU8'];
    if (!re) {
        free(src_ptr);
        let destLen = HEAPU32[ptr >> 2];
        if (destLen != length) {
            console.warn(`The length of uncompressed data should be ${length} bytes, but the length of uncompressed data is ${destLen} bytes.`);
        }
        let srcLen = HEAPU32[srcLen_ptr >> 2];
        if (srcLen != bytes.length) {
            console.warn(`The length of compressed data should be ${bytes.length} bytes, but only ${srcLen} bytes consumed.`);
        }
        let arr = new Uint8Array(destLen);
        arr.set(HEAPU8.subarray(dest_ptr, dest_ptr + destLen));
        free(dest_ptr);
        free(ptr);
        return arr;
    }
    free(src_ptr);
    free(dest_ptr);
    free(ptr);
    throw new Error(zlib.get_errmsg(re));
}

/**
 * @param {Uint8Array} data
 * @param {number} level
 */
async function compress(data, level) {
    await make_sure_is_initialized();
    return tcompress(data, level);
}

/**
 * @param {Uint8Array} data 
 * @param {number} length The length of uncompressed data.
 * @returns 
 */
async function uncompress(data, length) {
    await make_sure_is_initialized();
    return tuncompress(data, length);
}

module.exports = { zlib_initalized, compress, uncompress };
