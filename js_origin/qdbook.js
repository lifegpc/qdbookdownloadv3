const { browser } = require('./const');
const { getI18n } = require('./i18n');
const stringify = require('./json/stringify');
const { QDBookTag, QDBookInfo } = require('./qdbook_info');
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

function get_book_tags() {
    let eles = document.querySelectorAll('.book-information.cf > .book-info > .tag');
    if (!eles.length) return null;
    /**@type {HTMLElement}*/
    let ele = eles[0];
    let tags = [];
    for (let e of ele.children) {
        /**@type {HTMLElement}*/
        let e2 = e;
        let tag = e2.innerText.trim();
        let is_status_tag = e2.classList.contains('blue');
        let url = undefined;
        if (e2.tagName === 'A') {
            url = e2['href'];
        }
        tags.push(new QDBookTag(tag, is_status_tag, url));
    }
    let eles2 = document.getElementsByClassName('tags');
    for (let e of eles2) {
        /**@type {HTMLElement}*/
        let e2 = e;
        let url = undefined;
        if (e2.tagName === 'A') {
            url = e2['href'];
        }
        tags.push(new QDBookTag(e2.innerText.trim(), false, url));
    }
    return tags;
}

function get_book_name() {
    let eles = document.querySelectorAll('.book-information.cf > .book-info > h1 > em');
    if (!eles.length) return null;
    /**@type {HTMLElement}*/
    let ele = eles[0];
    return ele.innerText.trim();
}

function get_intro() {
    let eles = document.getElementsByClassName('intro');
    if (!eles.length) return null;
    /**@type {HTMLElement}*/
    let ele = eles[0];
    return ele.innerText.trim();
}

function get_full_intro() {
    let eles = document.getElementsByClassName('book-intro');
    if (!eles.length) return null;
    /**@type {HTMLElement}*/
    let ele = eles[0];
    return ele.innerHTML.trim();
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
            data["tags"] = get_book_tags();
            data['intro'] = get_intro();
            data['full_intro'] = get_full_intro();
            let ndata = stringify(data, QDBookInfo.get_json_map(), true, true);
            re['data'] = ndata;
        }
        sendResponse(re);
        return true;
    }
    return false;
});
