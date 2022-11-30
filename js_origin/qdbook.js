const { browser } = require('./const');
const { getI18n } = require('./i18n');
const { split_filename } = require('./zip/utils');

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
    let eles = document.getElementsByClassName('error-wrap-new cf')[0].getElementsByTagName('h1');
    if (!eles.length) return "";
    return eles[0].innerText.trim();
}

function get_book_img() {
    let eles = document.querySelectorAll('.book-information.cf .book-img');
    if (!eles.length) return null;
    let imgs = eles[0].getElementsByTagName('img');
    if (!imgs.length) return null;
    let url = new URL(imgs[0].src);
    let filenames = split_filename(url.pathname);
    filenames.pop();
    url.pathname = filenames.join('/');
    return url.toString();
}

function get_book_name() {
    let eles = document.querySelectorAll('.book-information.cf > .book-info > h1 > em');
    if (!eles.length) return null;
    /**@type {HTMLElement}*/
    let ele = eles[0];
    return ele.innerText.trim();
}

browser['runtime']['onMessage']['addListener']((request, sender, sendResponse) => {
    if (request['@type'] == 'get_qdbook_gdata') {
        let re = { "@type": "qdbook_gdata", "ok": true, 'msg': 'ok' }
        if (document.getElementsByClassName('error-wrap-new cf').length) {
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
    if (request['@type'] == 'get_qdbook') {
        let re = { "@type": "qdbook", "ok": true };
        if (document.getElementsByClassName('error-wrap-new cf').length) {
            re['ok'] = false;
            re['msg'] = getI18n('error_occured') + get_trimed_err_msg();
        } else {
            let g_data = request['g_data'];
            let data = {};
            data["img"] = get_book_img();
            data["name"] = get_book_name();
            re['data'] = data;
        }
        sendResponse(re);
        return true;
    }
    return false;
});
