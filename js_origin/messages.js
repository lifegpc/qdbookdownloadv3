const { browser } = require('./const');

/**
 * @param {number} tabId Tab id
 * @param g_data Global data
 * @returns {Promise<any>} data
 */
function _getQdChapter(tabId, g_data) {
    /**@type {Promise<any>} data*/
    let p = browser['tabs']['sendMessage'](tabId, {'@type': 'get_qdchapter', 'g_data': g_data});
    return p;
}

/**
 * @param {number} tabId Tab id
 * @param g_data Global data
 * @returns {Promise<any>} data
 */
function getQdChapter(tabId, g_data) {
    return new Promise((resolve, reject) => {
        function a() {
            _getQdChapter(tabId, g_data).then(data => {
                let code = data['code'];
                if (code == 0) {
                    resolve(data);
                } else if (code == 2) {
                    console.log('Retry after 0.1 sencond.')
                    setTimeout(a, 100);
                } else {
                    reject(data['code']);
                }
            }).catch(error => {
                reject(error);
            });
        }
        a();
    })
}

/**
 * @param {number} tabId Tab id
 * @returns {Promise<any>} data
 */
function getQdChapterGdata(tabId) {
    /**@type {Promise<any>} data*/
    let p = browser['tabs']['sendMessage'](tabId, {'@type': 'get_qdchapter_gdata'});
    return p;
}

/**
 * @param {number} tabId Tab id
 * @returns {Promise<any>} data
 */
 function getQdBookGdata(tabId) {
    /**@type {Promise<any>} data*/
    let p = browser['tabs']['sendMessage'](tabId, {'@type': 'get_qdbook_gdata'});
    return p;
}

/**
 * @param {Uint8Array | string} data Data. If it is a string, will encoding it with UTF-8.
 * @param {number} level Compression level.
 * @returns {Promise<{data: Uint8Array, length: number}>}
 */
function quick_compress(data, level) {
    if (typeof data == "string") {
        data = new TextEncoder().encode(data);
    }
    let len = data.length;
    /**@type {HTMLIFrameElement} */
    let sandbox = document.getElementById('sandbox');
    let rand = Math.random();
    sandbox.contentWindow.postMessage({'@type': 'quick_compress', 'data': data, 'rand': rand, 'level': level}, "*");
    return new Promise((resolve, reject) => {
        /**
         * @param {MessageEvent} ev
         */
        let listener = (ev) => {
            let data = ev.data;
            if (data['@type'] == 'quick_compress_result') {
                if (rand == data['rand']) {
                    window.removeEventListener('message', listener);
                    let ok = data['ok'];
                    if (ok) {
                        resolve({data: data['data'], length: len});
                    } else {
                        reject(data['error']);
                    }
                    ev.stopImmediatePropagation();
                }
            }
        }
        window.addEventListener('message', listener);
    })
}

/**
 * @param {Uint8Array | {"data": Uint8Array, "length": number}} data Compressed data. If data is Uint8Array, the length will be used.
 * @param {number} length The length of uncompressed data.
 * @returns {Promise<Uint8Array>}
 */
function quick_uncompress(data, length) {
    if (data.constructor !== Uint8Array) {
        length = data['length'];
        data = data['data'];
    }
    /**@type {HTMLIFrameElement} */
    let sandbox = document.getElementById('sandbox');
    let rand = Math.random();
    sandbox.contentWindow.postMessage({'@type': 'quick_uncompress', 'data': data, 'length': length, 'rand': rand}, "*");
    return new Promise((resolve, reject) => {
        /**
         * @param {MessageEvent} ev
         */
        let listener = (ev) => {
            let data = ev.data;
            if (data['@type'] == 'quick_uncompress_result') {
                if (rand == data['rand']) {
                    window.removeEventListener('message', listener);
                    let ok = data['ok'];
                    if (ok) {
                        resolve(data['data']);
                    } else {
                        reject(data['error']);
                    }
                    ev.stopImmediatePropagation();
                }
            }
        }
        window.addEventListener('message', listener);
    })
}

/**
 * @param {Uint8Array | {"data": Uint8Array, "length": number}} data Compressed data. If data is Uint8Array, the length will be used.
 * @param {number} length The length of uncompressed data.
 * @param {string} encoding Encoding.
 * @returns 
 */
async function quick_uncompress_with_decode(data, length, encoding) {
    let s = await quick_uncompress(data, length);
    let decoder = new TextDecoder(encoding);
    return decoder.decode(s);
}

module.exports = {
    getQdBookGdata,
    getQdChapter,
    getQdChapterGdata,
    quick_compress,
    quick_uncompress,
    quick_uncompress_with_decode,
};
