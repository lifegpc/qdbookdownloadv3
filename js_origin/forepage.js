const { browser } = require('./const');
const { getI18n } = require('./i18n');
const connect_handler = require('./sandbox_proxy');

function basic_init() {
    let title = document.createElement('title');
    let t = getI18n('forepage_title');
    title.innerText = t;
    document.head.append(title);
    document.getElementById('title').innerText = t;
}

window.addEventListener('load', () => {
    basic_init();
});

browser['runtime']['onConnect']['addListener'](connect_handler);
