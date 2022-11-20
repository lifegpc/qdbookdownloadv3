const zlib = require('./_zlib');

let zlib_initalized = false;

zlib['onRuntimeInitialized'] = () => {
    console.log('zlib version:', zlib.version());
    zlib_initalized = true;
}

const Z_STREAM_END = 1;
const Z_FINISH = 4;

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

class Deflate {
    constructor(level = -1) {
        let malloc = zlib['_malloc'];
        let deflate_init = zlib['_deflate_init'];
        let stream_out = malloc(4);
        if (stream_out == null) {
            throw new Error('No enough memory.');
        }
        let re = deflate_init(level, stream_out);
        if (!re) {
            /**@type {number}*/
            this._stream = zlib['HEAPU32'][stream_out >> 2];
        }
        zlib['_free'](stream_out);
        if (re) throw new Error(zlib.get_errmsg(re));
        /**@type {boolean}*/
        this._finshed = false;
    }
    _data_type() {
        if (this._stream == null) throw new Error('The stream is destroyed.');
        return zlib['_z_stream_data_type'](this._stream);
    }
    _destory() {
        let free = zlib['_free'];
        let deflateEnd = zlib['_deflateEnd'];
        if (this._stream) {
            deflateEnd(this._stream);
            free(this._stream);
            this._stream = null;
        }
        this._finshed = true;
    }
    _finish() {
        let malloc = zlib['_malloc'];
        let free = zlib['_free'];
        let deflate = zlib['_deflate2'];
        let destLen_ptr = malloc(8);
        if (destLen_ptr == null) {
            throw new Error('No enough memory.');
        }
        let dest_ptr_ptr = destLen_ptr + 4;
        let re = 0;
        let array = new Uint8Array();
        while (re != Z_STREAM_END) {
            zlib['HEAPU32'][destLen_ptr >> 2] = 4096;
            re = deflate(this._stream, 0, 0, dest_ptr_ptr, destLen_ptr, Z_FINISH);
            if (re != 0 && re != Z_STREAM_END) {
                free(destLen_ptr);
                throw new Error(zlib.get_errmsg(re));
            }
            let destLen = zlib['HEAPU32'][destLen_ptr >> 2];
            let dest_ptr = zlib['HEAPU32'][dest_ptr_ptr >> 2];
            let len = array.length;
            let tmp = new Uint8Array(len + destLen);
            tmp.set(array);
            tmp.set(zlib['HEAPU8'].subarray(dest_ptr, dest_ptr + destLen), len);
            array = tmp;
            free(dest_ptr);
        }
        free(destLen_ptr);
        this._finshed = true;
        return array;
    }
    /**
     * @param {Uint8Array} data
     */
    _update(data) {
        if (this._finshed) throw new Error('The stream has been finished.');
        if (!data.length) return new Uint8Array();
        let malloc = zlib['_malloc'];
        let free = zlib['_free'];
        let deflate = zlib['_deflate2'];
        let source_ptr = malloc(data.length);
        if (source_ptr == null) {
            throw new Error('No enough memory.');
        }
        zlib['HEAPU8'].set(data, source_ptr);
        let sourceLen_ptr = malloc(12);
        if (sourceLen_ptr == null) {
            free(source_ptr);
            throw new Error('No enough memory.');
        }
        let destLen_ptr = sourceLen_ptr + 4;
        let dest_ptr_ptr = sourceLen_ptr + 8;
        zlib['HEAPU32'][sourceLen_ptr >> 2] = data.length;
        zlib['HEAPU32'][destLen_ptr >> 2] = data.length;
        let re = deflate(this._stream, source_ptr, sourceLen_ptr, dest_ptr_ptr, destLen_ptr, 0);
        if (!re) {
            let destLen = zlib['HEAPU32'][destLen_ptr >> 2];
            let dest_ptr = zlib['HEAPU32'][dest_ptr_ptr >> 2];
            let arr = new Uint8Array(destLen);
            arr.set(zlib['HEAPU8'].subarray(dest_ptr, dest_ptr + destLen));
            free(dest_ptr);
            free(sourceLen_ptr);
            free(source_ptr);
            return arr;
        } else {
            free(sourceLen_ptr);
            free(source_ptr);
            throw new Error(zlib.get_errmsg(re));
        }
    }
}

/**
 * @param {Uint8Array} data Data
 * @param {number} level Compress Level
 */
async function compress2(data, level = -1) {
    await make_sure_is_initialized();
    let stream = new Deflate(level);
    try {
        let arr = stream._update(data);
        let arr2 = stream._finish();
        let tmp = new Uint8Array(arr.length + arr2.length);
        tmp.set(arr);
        tmp.set(arr2, arr.length);
        stream._destory();
        return tmp;
    } catch (e) {
        stream._destory();
        throw e;
    }
}

async function compress2d(data, level = -1) {
    await make_sure_is_initialized();
    let stream = new Deflate(level);
    try {
        let arr = stream._update(data);
        let arr2 = stream._finish();
        let tmp = new Uint8Array(arr.length + arr2.length);
        tmp.set(arr);
        tmp.set(arr2, arr.length);
        let is_text = stream._data_type() == 1;
        stream._destory();
        return { 'data': tmp, 'is_text': is_text }
    } catch (e) {
        stream._destory();
        throw e;
    }
}

module.exports = { zlib_initalized, Deflate, compress, compress2, compress2d, uncompress };
