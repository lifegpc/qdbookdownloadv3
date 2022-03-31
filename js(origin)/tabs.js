const { browser } = require('./const');

/**
 * @param {number} currentWindow Whether the tabs are in the current window.
 * @returns {Promise<Array<any>>}
 */
function getCurrentTabs(currentWindow = true) {
    return browser['tabs']['query'](
        {'active': true, 'currentWindow': currentWindow}
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

module.exports = { getCurrentTabs, getCurrentTab }
