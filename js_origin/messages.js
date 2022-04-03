const { browser } = require('./const');

/**
 * @param {number} tabId Tab id
 * @param g_data Global data
 * @returns {Promise<any>} data
 */
function getQdChapter(tabId, g_data) {
    /**@type {Promise<any>} data*/
    let p = browser['tabs']['sendMessage'](tabId, {'@type': 'get_qdchapter', 'g_data': g_data});
    return p;
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

module.exports = { getQdChapter, getQdChapterGdata, quick_compress };
