const { browser } = require('./const');

/**
 * @param {number} tabId
 * @param {{name: string | undefined, frameId: number | undefined, documentId: number | undefined} | undefined} connectInfo
 */
function connectTab(tabId, connectInfo = undefined) {
    return browser['tabs']['connect'](tabId, connectInfo);
}

/**
 * @param {boolean} currentWindow Whether the tabs are in the current window.
 * @returns {Promise<Array<any>>}
 */
function getCurrentTabs(currentWindow = true) {
    return browser['tabs']['query'](
        { 'active': true, 'currentWindow': currentWindow }
    );
}

function getCurrentTab() {
    return new Promise((resolve, reject) => {
        getCurrentTabs().then((tabs) => {
            resolve(tabs[0]);
        }).catch(r => {
            reject(r);
        })
    })
}

/**
 * @param {boolean} discarded Whether the tabs are discarded. A discarded tab is one whose content has been unloaded from memory, but is still visible in the tab strip. Its content is reloaded the next time it is activated.
 * @returns {Promise<Array<any>>}
 */
function getExtensionTabs(discarded = undefined) {
    let params = { 'currentWindow': false, 'url': browser['runtime']['getURL']('/*') };
    if (typeof discarded == "boolean") {
        params['discarded'] = discarded;
    }
    return browser['tabs']['query'](params);
}

/**
 * @param {number} tabId Tab id
 * @param {boolean} allow_error Whether to allow error.
 * @returns {Promise<any | undefined>}
 */
function getTab(tabId, allow_error = false) {
    if (!allow_error) return browser['tabs']['get'](tabId);
    return new Promise((resolve, reject) => {
        browser['tabs']['get'](tabId).then(tab => resolve(tab)).catch(_ => resolve(undefined));
    });
}

/**
 * @param {number | Array<number>} tabIndex
 * @param {number | undefined} windowId
 * @returns {Promise<any>}
 */
function highlightTab(tabIndex, windowId = undefined) {
    let o = { 'tabs': tabIndex };
    if (windowId !== undefined) o['windowId'] = windowId;
    return browser['tabs']['highlight'](o);
}

/**
 * @param {number} tabId
 * @param {boolean} bypassCache Whether to bypass local caching.
 * @returns {Promise<any>}
 */
function reloadTab(tabId, bypassCache = false) {
    return browser['tabs']['reload'](tabId, { 'bypassCache': bypassCache });
}

/**
 * @param {number | Array<number>} tabId
 * @returns {Promise<void>}
 */
function removeTab(tabId) {
    return browser['tabs']['remove'](tabId);
}

function waitTabLoaded(tabId) {
    return new Promise((resolve, reject) => {
        let timer = setInterval(() => {
            browser['tabs']['get'](tabId).then(tab => {
                if (tab['status'] == 'complete') {
                    clearInterval(timer);
                    resolve();
                }
            }).catch(r => {
                clearInterval(timer);
                reject(r);
            })
        }, 100);
    })
}

module.exports = { connectTab, getCurrentTabs, getCurrentTab, getExtensionTabs, getTab, highlightTab, reloadTab, removeTab, waitTabLoaded }
