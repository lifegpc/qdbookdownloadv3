const { browser } = require('./const');
const { getI18n } = require('./i18n');
const stringify = require('./json/stringify');
const { QDBookTag, QDBookInfo, QDVolume, QDChapter } = require('./qdbook_info');
const { split_filename } = require('./zip/utils');

const TIME_REGEX = /\d+-\d+-\d+ \d+:\d+\d+/
const WD_REGEX = /\d+ *$/

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
        let status = e2.classList.contains('blue') ? 0 : 1;
        let url = undefined;
        if (e2.tagName === 'A') {
            url = e2['href'];
        }
        tags.push(new QDBookTag(tag, status, url));
    }
    let eles2 = document.getElementsByClassName('tags');
    for (let e of eles2) {
        /**@type {HTMLElement}*/
        let e2 = e;
        let url = undefined;
        if (e2.tagName === 'A') {
            url = e2['href'];
        }
        tags.push(new QDBookTag(e2.innerText.trim(), 2, url));
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

function get_chapter_tree() {
    let volumes = document.getElementsByClassName('volume');
    if (!volumes.length) return [];
    /**@type {Array<QDVolume>} */
    let vols = [];
    for (let i = 0; i < volumes.length; i++) {
        /**@type {HTMLElement}*/
        let volume = volumes[i];
        let tmp = volume.querySelector('h3>i');
        if (tmp === null) {
            console.warn('Failed to get volume name');
            continue
        }
        let vol_namee = tmp.previousSibling;
        if (!(vol_namee instanceof Text)) {
            console.warn('Failed to get volume name');
            continue
        }
        let vol_name = vol_namee.textContent.trim();
        let is_vip = volume.querySelector('h3>.free') === null;
        let vol = new QDVolume(vol_name, is_vip);
        vols.push(vol);
        let chaps = volume.querySelector('ul.cf');
        if (chaps === null) {
            console.warn('Failed to get chapters');
            continue
        }
        for (let j = 0; j < chaps.children.length; j++) {
            let chap = chaps.children[j];
            let chapl = chap.querySelector('a');
            if (chapl === null) {
                console.warn('Failed to get chapter name');
                continue
            }
            let chap_name = chapl.innerText.trim();
            let chap_link = chapl.href;
            let upload_timee = chapl.title.match(TIME_REGEX);
            /**@type {Date | undefined}*/
            let upload_time = undefined;
            if (upload_timee === null) {
                console.warn('Failed to get upload time:', chapl.title);
            } else {
                let tmp = upload_timee[0].replace(' ', 'T') + '+08:00';
                try {
                    upload_time = new Date(tmp);
                } catch (e) {
                    console.warn('Failed to parse upload time:', tmp, e);
                }
            }
            let wdd = chapl.title.match(WD_REGEX);
            let word_count = undefined;
            if (wdd === null) {
                console.warn('Failed to get word count:', chapl.title);
            } else {
                word_count = parseInt(wdd[0]);
            }
            let locked = chap.querySelector('em.iconfont') !== null;
            let ch = new QDChapter(chap_name, chap_link, undefined, upload_time, word_count, locked);
            /// This will generate id if is exists in link.
            ch.try_get_id();
            vol._chapters.push(ch);
        }
    }
    return vols;
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
            data['volumes'] = get_chapter_tree();
            let ndata = stringify(data, QDBookInfo.get_json_map(), true, true);
            re['data'] = ndata;
        }
        sendResponse(re);
        return true;
    }
    return false;
});
