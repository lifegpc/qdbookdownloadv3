const { u8arrcmp } = require('./binary');
const { browser } = require('./const');
const { EventPool, MyEvent } = require('./eventpool');
const { getI18n } = require('./i18n');
const { QDChapterInfo } = require('./qdchapter_info');
const { get_settings } = require('./settings');
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

let current_port = undefined;
let ep = new EventPool();

async function create_port() {
    let port = browser['runtime']['connect']({ 'name': 'background' });
    current_port = port;
    port['onDisconnect']['addListener']((p) => {
        current_port = undefined;
        console.log(`port ${p['name']} was disconnected.`)
        let ev = new MyEvent('port-disconnect');
        ep._dispatchEvent(ev);
    });
    port['onMessage']['addListener']((m, p) => {
        let ev = new MyEvent('port-message');
        ev['data'] = m;
        ev['port'] = p;
        ep._dispatchEvent(ev);
    });
}

async function get_port() {
    if (current_port === undefined) {
        await create_port();
    }
    return current_port;
}

/**
 * @param {string} typ Type
 * @param {(port, rand: number) => void} req 
 * @param {(data) => any} res 
 */
function request_with_port(typ, req, res) {
    return new Promise((resolve, reject) => {
        get_port().then(port => {
            let rand = Math.random();
            /**@type {(ev: MyEvent) => void}*/
            let handler = (ev) => {
                let data = ev['data'];
                if (data['@type'] == typ && data['rand'] == rand) {
                    ev._stop();
                    ep._removeEventListener('port-message', handler);
                    ep._removeEventListener('port-disconnect', handler2);
                    if (data['ok'] === false) {
                        reject(data);
                    } else {
                        resolve(res(data));
                    }
                }
            };
            let handler2 = () => {
                ep._removeEventListener('port-message', handler);
                ep._removeEventListener('port-disconnect', handler2);
                reject(new Error('port disconnected.'));
            }
            ep._addEventListener('port-message', handler);
            ep._addEventListener('port-disconnect', handler2);
            req(port, rand);
        }).catch(reject)
    })
}

function eval_gdata(g_data) {
    return request_with_port('eval_gdata', (port, rand) => {
        port['postMessage']({ '@type': 'eval_gdata', 'g_data': g_data, 'rand': rand });
    }, data => data['g_data']);
}

/**
 * @param {number} chapter_id Chapter's id
 * @returns {Promise<[number, number, Date]>}
 */
async function get_latest_chapters_key_by_chapterId(chapter_id) {
    return request_with_port('qd_get_latest_chapters_key', (port, rand) => {
        port['postMessage']({ '@type': 'qd_get_latest_chapters_key', 'chapter_id': chapter_id, 'rand': rand });
    }, data => {
        let key = data['key'];
        if (!Array.isArray(key)) return key;
        key[2] = new Date(key[2]);
        return key;
    });
}

/**@type {string | undefined}*/
let fpScript = undefined;

let observer = new MutationObserver((data) => {
    for (let i of data) {
        if (i.type == 'childList') {
            /**@type {Element}*/
            let ele = i.target;
            if (ele.tagName == 'SCRIPT') {
                if (ele.id == 'fpScript' && fpScript === undefined) {
                    fpScript = ele.innerHTML;
                    console.log('fpScript loaded.');
                }
            }
        }
    }
})

observer.observe(document, { childList: true, subtree: true });

browser['runtime']['onMessage']['addListener']((request, sender, sendResponse) => {
    if (request['@type'] == 'get_qdchapter_gdata') {
        let re = { "@type": "qd_chapter_gdata", "ok": true, 'msg': 'ok' }
        if (document.getElementsByClassName('error-text fl').length) {
            re['ok'] = false;
            re['msg'] = '404或其他错误'
        } else {
            let g_data = get_g_data();
            if (!g_data) {
                re['ok'] = false;
                re['msg'] = '找不到数据';
            } else {
                re['g_data'] = g_data;
            }
        }
        sendResponse(re)
        return true;
    } else if (request['@type'] == 'get_qdchapter') {
        let data = { "name": "", "contents": [], "words": 0, "uploadTime": "" };
        let re = { "@type": "qdchapter", "ok": true, "code": 0, data: data };
        let ci = new QDChapterInfo(request['g_data']);
        if (document.getElementsByClassName('error-text fl').length) {
            re['code'] |= 1;
        } else {
            let cES = ci.chapter_cES();
            if (cES != 0 && cES != 2) {
                re['ok'] = false;
                re['msg'] = getI18n('unknown_protect_type');
                delete re['data'];
                sendResponse(re);
                return true;
            }
            if (cES == 2) {
                if (fpScript === undefined) {
                    re['code'] |= 2;
                    delete re['data'];
                    sendResponse(re);
                    return true;
                }
                data['fpScript'] = fpScript;
                let cols = document.getElementById(`j_${ci.chapterId()}`);
                if (cols === null) {
                    re['ok'] = false;
                    re['msg'] = 'Failed to find chapter content.';
                    delete re['data'];
                    sendResponse(re);
                    return true;
                }
                if (cols.children.length) {
                    for (let child of cols.children) {
                        if (child.tagName == 'P') {
                            /**@type {HTMLElement}*/
                            let c = child.cloneNode(true);
                            /**@type {HTMLElement}*/
                            let lc = c.lastChild;
                            if (lc.classList.contains("review-count")) {
                                c.removeChild(c.lastChild);
                            }
                            c.removeAttribute('data-type');
                            data['contents'].push(c.outerHTML);
                        }
                    }
                } else {
                    re['code'] |= 2;
                }
                let name = document.getElementsByClassName('j_chapterName');
                if (name.length) {
                    /**@type {HTMLElement}*/
                    let ele = name[0].children[0];
                    data['name'] = ele.innerText;
                    if (!data['name'].length) {
                        re['code'] |= 2;
                    }
                } else {
                    re['code'] |= 2;
                }
            } else {
                let ocols = document.getElementsByClassName('content-wrap');
                /**@type {Array<HTMLElement>} */
                let cols = [];
                for (let i = 0; i < ocols.length; i++) {
                    let p = ocols[i].parentElement;
                    if (p.getAttribute("data-type") == "2") {
                        cols.push(ocols[i]);
                    }
                }
                if (cols.length) {
                    data['name'] = cols[0].innerHTML;
                } else {
                    re['code'] |= 2;
                }
                let max = ci.vipStatus() == 1 && ci.isBuy() == 0 ? cols.length : cols.length - 1;
                if (max == 0) {
                    re['code'] |= 2;
                    sendResponse(re);
                    return true;
                }
                for (let i = 1; i < max; i++) {
                    let c = cols[i];
                    data['contents'].push(c.innerText);
                }
            }
            if (!ci.vipStatus()) {
                let url_path = split_filename(new URL(window.location.href).pathname);
                let eid = url_path[url_path.length - 1];
                data['eid'] = eid;
            }
            let cols = document.getElementsByClassName('j_chapterWordCut');
            if (cols.length) {
                try {
                    data['words'] = parseInt(cols[0].innerHTML);
                } catch (e) {
                    re['code'] |= 4;
                }
            } else {
                re['code'] |= 4;
            }
            cols = document.getElementsByClassName('j_updateTime');
            if (cols.length) {
                data['uploadTime'] = cols[0].innerHTML;
            } else {
                re['code'] |= 8;
            }
        }
        sendResponse(re);
        return true;
    }
    return false;
})

/**
 * @param {QDChapterInfo} chapter
 * @param {Date | undefined} time
 */
async function save_chapter(chapter, time) {
    return request_with_port('qd_save_chapter', (port, rand) => {
        let d = { '@type': 'qd_save_chapter', 'data': chapter._data, 'g_data': chapter._g_data, 'rand': rand };
        if (time !== undefined) d['time'] = time;
        port['postMessage'](d);
    }, () => { });
}

/**
 * @param {[number, number, Date]} key
 * @returns {Promise<QDChapterInfo>}
 */
async function get_chapter(key) {
    return request_with_port('qd_get_chapter', (port, rand) => {
        port['postMessage']({ '@type': 'qd_get_chapter', 'key': key, 'rand': rand });
    }, data => {
        return new QDChapterInfo(data['g_data'], data['data']);
    });
}

let saved_to_database = false;
let save_to_database_fatal = false;
let gg_data = undefined;

async function get_evaled_gdata() {
    if (gg_data === undefined) {
        let g_data = get_g_data();
        if (!g_data) {
            throw new Error('Can not find g_data.');
        }
        gg_data = await eval_gdata(g_data);
        console.log(gg_data);
    }
    return gg_data;
}

get_settings().then(settings => {
    async function save_to_database() {
        if (settings.autosave_to_database) {
            let g_data = await get_evaled_gdata();
            let data = { "name": "", "contents": [], "words": 0, "uploadTime": "" }
            let ci = new QDChapterInfo(g_data);
            if (document.getElementsByClassName('error-text fl').length) {
                save_to_database_fatal = true;
                throw new Error('404或其他错误');
            }
            if (ci.chapter_cES() != 0) {
                save_to_database_fatal = true;
                return;
            }
            let ocols = document.getElementsByClassName('content-wrap');
            /**@type {Array<HTMLElement>} */
            let cols = [];
            for (let i = 0; i < ocols.length; i++) {
                let p = ocols[i].parentElement;
                if (p.getAttribute("data-type") == "2") {
                    cols.push(ocols[i]);
                }
            }
            if (cols.length) {
                data['name'] = cols[0].innerHTML;
            } else {
                console.warn('Failed to get chapter name.');
            }
            let max = ci.vipStatus() == 1 && ci.isBuy() == 0 ? cols.length : cols.length - 1;
            if (ci.vipStatus() == 1 && ci.isBuy() == 0 && !settings.autosave_unbuy_chapter) {
                return;
            }
            if (!ci.vipStatus()) {
                let url_path = split_filename(new URL(window.location.href).pathname);
                let eid = url_path[url_path.length - 1];
                data['eid'] = eid;
            }
            if (max > 0) {
                for (let i = 1; i < max; i++) {
                    let c = cols[i];
                    data['contents'].push(c.innerText);
                }
                cols = document.getElementsByClassName('j_chapterWordCut');
                if (cols.length) {
                    try {
                        data['words'] = parseInt(cols[0].innerHTML);
                    } catch (e) {
                        console.warn('Failed to get words:', e);
                    }
                } else {
                    console.warn('Failed to get words.');
                }
                cols = document.getElementsByClassName('j_updateTime');
                if (cols.length) {
                    data['uploadTime'] = cols[0].innerHTML;
                } else {
                    console.warn('Failed to get upload time.')
                }
                ci._data = data;
                console.log('Current chapter:', ci);
                let key = await get_latest_chapters_key_by_chapterId(ci.chapterId());
                console.log('Latest key:', key);
                if (!key) {
                    await save_chapter(ci);
                    console.log('Saved chapter to database.');
                } else {
                    let old = await get_chapter(key);
                    let data_matched = u8arrcmp(old.get_hash(), ci.get_hash());
                    let eid_matched = old.encodedChapterId() === ci.encodedChapterId();
                    if (data_matched && eid_matched) {
                        console.log('Chapter not changed, skip save to database.');
                    } else {
                        await save_chapter(ci, (data_matched && !eid_matched) ? key[2] : undefined);
                        console.log('Saved chapter to database.');
                    }
                }
                saved_to_database = true;
            }
        }
        if (!saved_to_database && !save_to_database_fatal) {
            setTimeout(save_to_database2, 1000);
        }
    }
    function save_to_database2() {
        save_to_database().catch(e => {
            console.error(e)
            if (!save_to_database_fatal) setTimeout(save_to_database2, 1000);
        })
    };
    save_to_database2();
}).catch(e => console.error(e));
