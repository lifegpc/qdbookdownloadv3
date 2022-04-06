const { make_storage_persist } = require('../../storage');
const { QDBookInfo } = require('../../qdbook_info');
const { QDChapterInfo } = require('../../qdchapter_info');
const { quick_compress } = require('../../messages');

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
        let indexedReq = indexedDB.open('qd', 1);
        /**@param {IDBVersionChangeEvent} event*/
        indexedReq.onupgradeneeded = function (event) {
            let db = this.result;
            if (event.newVersion > 0) {
                db.createObjectStore('books', { keyPath: 'id' });
                db.createObjectStore('chapters', { keyPath: ['id', 'bookId', 'time'] });
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
                let d = {"data": data, "compressed": true, "bookId": info.bookId(), "id": info.chapterId(), 'time': t, 'hash': h};
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

module.exports = { get_book_info, save_chapter };
