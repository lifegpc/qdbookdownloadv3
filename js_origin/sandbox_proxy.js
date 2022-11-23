const { eval_gdata } = require('./eval');
const indexeddb_qd = require('./db/indexeddb/qd');
const { QDChapterInfo } = require('./qdchapter_info');

function connect_handler(port) {
    if (port['name'] != 'sandbox') return;
    port['onMessage']['addListener']((m, p) => {
        let typ = m['@type'];
        if (typ == "eval_gdata") {
            eval_gdata(m['g_data']).then(data => {
                p['postMessage']({ '@type': 'eval_gdata', 'ok': true, 'g_data': data, 'rand': m['rand'] });
            }).catch(e => {
                console.warn("Failed to eval gdata string:", e);
                p['postMessage']({ '@type': 'eval_gdata', 'ok': false });
            })
            return;
        } else if (typ == "qd_get_latest_chapters_key") {
            let chapter_id = m['chapter_id'];
            indexeddb_qd.get_latest_chapters_key_by_chapterId(chapter_id).then(key => {
                p['postMessage']({ '@type': 'qd_get_latest_chapters_key', 'ok': true, 'key': key, 'rand': m['rand'] });
            }).catch(e => {
                console.warn("Failed to get latest chapter's key:", e);
                p['postMessage']({ '@type': 'qd_get_latest_chapters_key', 'ok': false });
            })
        } else if (typ == 'qd_save_chapter') {
            let chapter = new QDChapterInfo(m['g_data'], m['data']);
            let re = { '@type': 'qd_save_chapter', 'ok': true, 'rand': m['rand'] }
            let time = m['time'];
            indexeddb_qd.save_chapter(chapter, time !== undefined ? new Date(time) : undefined).then(() => {
                p['postMessage'](re);
            }).catch(e => {
                console.warn("Failed to save chapter:", e);
                re['ok'] = false;
                p['postMessage'](re);
            })
        } else if (typ == "qd_get_chapter") {
            let key = m['key'];
            key[2] = new Date(key[2]);
            indexeddb_qd.get_chatper(key).then(chapter => {
                p['postMessage']({ '@type': 'qd_get_chapter', 'ok': true, 'g_data': chapter._g_data, "data": chapter._data, 'rand': m['rand'] });
            }).catch(e => {
                console.warn("Failed to get chapter:", e);
                p['postMessage']({ '@type': 'qd_get_chapter', 'ok': false });
            })
        }
    })
}

module.exports = connect_handler;
