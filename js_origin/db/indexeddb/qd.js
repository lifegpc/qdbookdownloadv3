const { make_storage_persist } = require('../../storage');
const { QDBookInfo } = require('../../qdbook_info');
const { QDChapterInfo } = require('../../qdchapter_info');
const { quick_compress, quick_uncompress_with_decode } = require('../../messages');
const { arrayBufferToHex, u8arrcmp } = require('../../binary');
const stringify = require('../../json/stringify');

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
        let indexedReq = indexedDB.open('qd', 3);
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
            if (isNaN(event.oldVersion) || event.oldVersion < 3) {
                /**@type {IDBTransaction} */
                let txn = event.target['transaction'];
                let chapters = txn.objectStore('chapters');
                chapters.createIndex('eid', 'eid');
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
 * @template T
 * @param {string} name
 * @param {IDBValidKey | IDBKeyRange} key
 * @param {T} data
 * @returns {Promise<T>}
 */
function delete_idb_data(name, key, data) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction([name], 'readwrite');
            let store = tx.objectStore(name);
            let req = store.delete(key);
            req.onsuccess = () => {
                resolve(data);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        }).catch(reject)
    })
}

/**
 * Delete chapter(s)
 * @param {number|[number, number, Date]|Array<[number, number, Date]>} key Primary key(s). If key is number, it is chapterId.
 * @return {Promise<any>}
 */
function delete_chapter(key) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let typ = typeof key;
            let errors = [];
            /**Complete count*/
            let i = 0;
            /**@type {number} Basic length*/
            let blen = undefined;
            function resolve_function() {
                i += 1;
                if (i == blen) {
                    errors.length ? reject(errors) : resolve();
                }
            }
            /**@param {any} err Error*/
            function reject_function(err) {
                i += 1;
                errors.append(err);
                if (i == blen) {
                    errors.length ? reject(errors) : resolve();
                }
            }
            function is_multiply_key() {
                if (!Array.isArray(key)) return false;
                if (key.length === 3) return false;
                for (let k of key) {
                    if (!Array.isArray(k) || k.length !== 3) return false;
                }
                return true;
            }
            if (typ == "number") {
                get_chapters_keys_by_chapterId(key).then((keys) => {
                    if (keys === undefined || keys.length == 0) {
                        resolve();
                        return;
                    }
                    blen = keys.length;
                    for (let k of keys) {
                        delete_idb_data('chapters', k).then(resolve_function).catch(reject_function);
                    }
                }).catch(reject)
            } else if (is_multiply_key()) {
                blen = key.length;
                for (let k of key) {
                    delete_idb_data('chapters', k).then(resolve_function).catch(reject_function);
                }
            } else {
                delete_idb_data('chapters', key).then(resolve).catch(reject);
            }
        }).catch(reject)
    })
}

/**
 * Get book info from database
 * @param {number} bookId
 * @returns {Promise<QDBookInfo | undefined>}
 */
function get_book_info(bookId) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['books'], 'readonly');
            let store = tx.objectStore('books');
            let req = store.get(bookId);
            req.onsuccess = () => {
                resolve(req.result !== undefined ? QDBookInfo.fromJson(req.result) : undefined);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        })
    })
}

/**
 * Get book info from chapters list
 * @param {number} bookId 
 */
async function get_book_info_from_chapter(bookId) {
    let keys = await get_chapters_keys_by_bookId(bookId);
    if (!keys.length) return null;
    keys.sort((a, b) => { return b[2] - a[2] });
    return await get_chatper(keys[0]);
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
 * Return all book ids in books store
 * @returns {Promise<Array<number>>}
 */
function get_all_book_ids() {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['books'], 'readonly');
            let store = tx.objectStore('books');
            let req = store.getAllKeys();
            req.onsuccess = () => {
                resolve(req.result);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        }).catch(reject)
    })
}

/**
 * Return all available book ids from chapters
 * @param {Array<[number, number, Date]>} data Chapter key's list. Can be undefined.
 * @returns {Promise<Array<number>>}
 */
async function get_all_book_ids_from_chapters(data) {
    data = data || (await get_all_chapters_keys());
    let ids = [];
    for (let d of data) {
        let bookId = d[1];
        if (ids.indexOf(bookId) == -1) {
            ids.push(bookId);
        }
    }
    return ids;
}

/**
 * Get all chapters' keys from database
 * @returns {Promise<Array<[number, number, Date]>>}
 */
function get_all_chapters_keys() {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let tx = db.transaction(['chapters'], 'readonly');
            let store = tx.objectStore('chapters');
            let req = store.getAllKeys();
            req.onsuccess = () => {
                resolve(req.result);
            }
            req.onerror = () => {
                need_reinit = true;
                reject(req.error);
            }
        }).catch(reject);
    })
}

/**
 * search all chapters keys by bookId
 * @param {number} bookId BookId
 * @returns {Promise<Array<[number, number, Date]>>}
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
 * @returns {Promise<Array<[number, number, Date]>>}
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
 * @returns {Promise<[number, number, Date]>}
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
 * @param {[number, number, Date]} key 
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
 * @param {Date | undefined} time
 */
function save_chapter(info, time = undefined) {
    return new Promise((resolve, reject) => {
        init().then(() => {
            let data = info.toJson();
            let sdata = stringify(data);
            let t = time !== undefined ? time : new Date();
            let h = info.get_hash();
            quick_compress(sdata).then((data) => {
                let d = { "data": data, "compressed": true, "bookId": info.bookId(), "id": info.chapterId(), 'time': t, 'hash': h };
                let eid = info.encodedChapterId();
                if (eid !== undefined) d['eid'] = eid;
                set_idb_data('chapters', d).then(resolve).catch(reject);
            }).catch(e => {
                console.warn(e);
                data['compressed'] = false;
                data['bookId'] = info.bookId();
                data['id'] = info.chapterId();
                data['time'] = t;
                data['hash'] = h;
                let eid = info.encodedChapterId();
                if (eid !== undefined) data['eid'] = eid;
                set_idb_data('chapters', data).then(resolve).catch(reject);
            })
        })
    })
}

module.exports = {
    delete_chapter,
    get_all_book_ids,
    get_all_book_ids_from_chapters,
    get_all_chapters_keys,
    get_book_info,
    get_book_info_from_chapter,
    get_chapters_keys_by_bookId,
    get_chapters_keys_by_chapterId,
    get_chatper,
    get_latest_chapters_key_by_chapterId,
    save_chapter,
};
