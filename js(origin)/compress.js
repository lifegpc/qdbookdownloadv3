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
 * @param {Uint8Array} data
 * @param {number} level
 */
async function compress(data, level) {
    await make_sure_is_initialized();
    return tcompress(data, level);
}

module.exports = { zlib_initalized, compress };
