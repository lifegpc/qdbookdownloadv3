const { browser } = require('./const');

/**
 * @param {number} tabId
 */
function connectTab(tabId, connectInfo = undefined) {
    return browser['tabs']['connect'](tabId, connectInfo);
}

/**
 * @param {number} currentWindow Whether the tabs are in the current window.
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

async function waitTabLoaded(tabId) {
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

module.exports = { connectTab, getCurrentTabs, getCurrentTab, getExtensionTabs, waitTabLoaded }
