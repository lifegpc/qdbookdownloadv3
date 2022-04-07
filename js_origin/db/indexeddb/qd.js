const { make_storage_persist } = require('../../storage');
const { QDBookInfo } = require('../../qdbook_info');
const { QDChapterInfo } = require('../../qdchapter_info');
const { quick_compress, quick_uncompress_with_decode } = require('../../messages');
const { arrayBufferToHex, u8arrcmp } = require('../../binary');

/**@type {IDBDatabase}*/
let db = undefined;
let need_reinit = false;

function init() {
    return new Promise((resolve, reject) => {
        make_storage_persist();
        if (db !== undefined && !need_reinit) {
            resolve();
            return;
        }
        let indexedReq = indexedDB.open('qd', 2);
        /**@param {IDBVersionChangeEvent} event*/
        indexedReq.onupgradeneeded = function (event) {
            let db = this.result;
            console.log(`upgrade qd from ${event.oldVersion} to ${event.newVersion}`);
            /*No version or version < 1 -> v1 */
            if (isNaN(event.oldVersion) || event.oldVersion < 1) {
                db.createObjectStore('books', { keyPath: 'id' });
                db.createObjectStore('chapters', { keyPath: ['id', 'bookId', 'time'] });
            }
            /*v1 -> v2*/
            if (isNaN(event.oldVersion) || event.oldVersion < 2) {
                /**@type {IDBTransaction} */
                let txn = event.target['transaction'];
                let chapters = txn.objectStore('chapters');
                chapters.createIndex('bookId', 'bookId');
                chapters.createIndex('id', 'id');
            }
        }
        indexedReq.onsuccess = () => {
            db = indexedReq.result;
            resolve();
        }
        indexedReq.onerror = () => {
            reject(indexedReq.error);
        }
    })
}

/**
 * Get book info from database
 * @param {number} bookId
 */
function get_book_info(bookId) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['books'], 'readonly');
            let store = tx.objectStore('books');
            let req = store.get(bookId);
            req.onsuccess = () => {
                resolve(req.result === undefined ? QDBookInfo.fromJson(req.result) : undefined);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

function set_idb_data(loc, data, id) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction([loc], 'readwrite');
            let store = tx.objectStore(loc);
            let req = store.put(data, id);
            req.onsuccess = () => {
                resolve();
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

/**
 * search all chapters keys by bookId
 * @param {number} bookId BookId
 * @returns {Array<[number, number, Time]>}
 */
function get_chapters_keys_by_bookId(bookId) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['chapters'], 'readonly');
            let store = tx.objectStore('chapters');
            let ind = store.index('bookId');
            let req = ind.getAllKeys(bookId);
            req.onsuccess = () => {
                resolve(req.result);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

/**
 * search all chapters keys by chapterId
 * @param {number} id chapterId
 * @returns {Array<[number, number, Time]>}
 */
function get_chapters_keys_by_chapterId(id) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['chapters'], 'readonly');
            let store = tx.objectStore('chapters');
            let ind = store.index('id');
            let req = ind.getAllKeys(id);
            req.onsuccess = () => {
                resolve(req.result);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

/**
 * Return latest chapter key by chapterId
 * @param {number} id chapterId
 * @returns {[number, number, Time]}
 */
async function get_latest_chapters_key_by_chapterId(id) {
    let keys = await get_chapters_keys_by_chapterId(id);
    if (keys === undefined || keys.length == 0) {
        return undefined;
    }
    let key = undefined;
    keys.forEach((k) => {
        if (key === undefined || k[2] > key[2]) {
            key = k;
        }
    })
    return key;
}

/**
 * return chapter information by key
 * @param {[number, number, Time]} key 
 * @returns {Promise<QDChapterInfo>}
 */
function get_chatper(key) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['chapters'], 'readonly');
            let store = tx.objectStore('chapters');
            let req = store.get(key);
            req.onsuccess = () => {
                let result = req.result;
                /**@param {QDChapterInfo} inf*/
                function check_result(inf) {
                    if (u8arrcmp(inf.get_hash(), result['hash'])) resolve(inf);
                    else {
                        console.warn('Origin hash:', arrayBufferToHex(inf['hash']));
                        console.warn('New hash:', arrayBufferToHex(inf.get_hash()));
                        reject(new Error('hash not match'));
                    }
                }
                if (result !== undefined) {
                    if (result['compressed']) {
                        quick_uncompress_with_decode(result['data']).then(data => {
                            let obj = JSON.parse(data);
                            check_result(QDChapterInfo.fromJson(obj));
                        })
                    } else {
                        check_result(QDChapterInfo.fromJson(result));
                    }
                } else {
                    resolve(undefined);
                }
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

/**
 * Save chapter into database
 * @param {QDChapterInfo} info Chapter information
 */
function save_chapter(info) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let data = info.toJson();
            let sdata = JSON.stringify(data);
            let t = new Date();
            let h = info.get_hash();
            quick_compress(sdata).then((data) => {
                let d = { "data": data, "compressed": true, "bookId": info.bookId(), "id": info.chapterId(), 'time': t, 'hash': h };
                set_idb_data('chapters', d).then(resolve).catch(reject);
            }).catch(e => {
                console.warn(e);
                data['compressed'] = false;
                data['bookId'] = info.bookId();
                data['id'] = info.chapterId();
                data['time'] = t;
                data['hash'] = h;
                set_idb_data('chapters', data).then(resolve).catch(reject);
            })
        })
    })
}

module.exports = {
    get_book_info,
    get_chapters_keys_by_bookId,
    get_chapters_keys_by_chapterId,
    get_chatper,
    get_latest_chapters_key_by_chapterId,
    save_chapter,
};
