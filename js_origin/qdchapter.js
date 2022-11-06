const { browser } = require('./const');
const { EventPool, MyEvent } = require('./eventpool');
const { QDChapterInfo } = require('./qdchapter_info');
const { get_settings } = require('./settings')

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
    }, data => data['key']);
}

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
        let re = { "@type": "qdchapter", "code": 0, data: data };
        let ci = new QDChapterInfo(request['g_data']);
        if (document.getElementsByClassName('error-text fl').length) {
            re['code'] |= 1;
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
            if (ci.vipStatus() == 1 && ci.isBuy() == 0) {
                // TODO: Add buy status
            }
            if (max == 0) {
                re['code'] |= 2;
                sendResponse(re);
                return true;
            }
            for (let i = 1; i < max; i++) {
                let c = cols[i];
                data['contents'].push(c.innerText);
            }
            cols = document.getElementsByClassName('j_chapterWordCut');
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
 */
async function save_chapter(chapter) {
    return request_with_port('qd_save_chapter', (port, rand) => {
        port['postMessage']({ '@type': 'qd_save_chapter', 'data': chapter._data, 'g_data': chapter._g_data, 'rand': rand });
    }, () => { });
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
            if (ci.vipStatus() == 1 && ci.isBuy() == 0) {
                // TODO: Add buy status
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
