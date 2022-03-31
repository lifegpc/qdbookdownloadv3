const { browser } = require('./const')

/**
 * @param {string} messageName Message name
 * @returns {string} translated message
 */
function getI18n(messageName) {
    let i18n = browser['i18n'];
    return i18n['getMessage'](messageName);
}

module.exports = { getI18n };
