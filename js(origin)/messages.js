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

module.exports = { getQdChapter, getQdChapterGdata };
