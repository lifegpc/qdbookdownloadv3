const { browser } = require('./const');
const { getI18n } = require('./i18n');

function get_g_data() {
    let cols = document.getElementsByTagName('script');
    for (let i = 0; i < cols.length; i++) {
        let c = cols[i];
        if (c.innerText.indexOf('g_data') >= 0) {
            return c.innerText;
        }
    }
}

function get_trimed_err_msg() {
    let ele = document.getElementsByClassName('error-text fl')[0];
    let s = ele.textContent.split('\n');
    let i = 0;
    for (i = 0; i < s.length; i++) {
        s[i] = s[i].trim();
    }
    return s.join('\n');
}

browser['runtime']['onMessage']['addListener']((request, sender, sendResponse) => {
    if (request['@type'] == 'get_qdbook_gdata') {
        let re = {"@type": "qdbook_gdata", "ok": true, 'msg': 'ok'}
        if (document.getElementsByClassName('error-text fl').length) {
            re['ok'] = false;
            re['msg'] = getI18n('error_occured') + get_trimed_err_msg();
        } else {
            let g_data = get_g_data();
            if (!g_data) {
                re['ok'] = false;
                re['msg'] = getI18n('data_not_found');
            } else {
                re['g_data'] = g_data;
            }
        }
        sendResponse(re);
        return true;
    }
    return false;
});
