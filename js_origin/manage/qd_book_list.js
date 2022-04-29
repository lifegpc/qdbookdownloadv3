const indexeddb = require('../db/indexeddb/qd');
const { getI18n } = require('../i18n');
const { get_page_params, change_page_params } = require('../params');
const { QDChapterInfo } = require('../qdchapter_info');

/**
 * @param {Array<[number, number, Date]>} data Chapter's keys list. Can be undefined.
 * @returns {[Array<number>, Array<number>]} Index 0: book id which have detailed information. Index 1: Book id only in chapters database.
 */
async function get_all_books_id(data) {
    let chapters_book_ids = await indexeddb.get_all_book_ids_from_chapters(data);
    let book_ids = await indexeddb.get_all_book_ids();
    for (let id of book_ids) {
        let i = chapters_book_ids.indexOf(id);
        if (i != -1) {
            chapters_book_ids.splice(i, 1);
        }
    }
    return [book_ids, chapters_book_ids];
}

/**
 * Generate book list
 * @param {Document} doc Document
 */
async function gen_book_list(doc = document) {
    let div = doc.createElement('div');
    div.classList.add('qd-book-list');
    let book_list = doc.createElement('div');
    book_list.classList.add('book-list');
    div.append(book_list);
    /**
     * Add a item to list
     * @param {HTMLDivElement} d 
     * @param {number} bid
     */
    function add_item(d, bid) {
        d.addEventListener('click', () => {
            let params = get_page_params();
            params.delete('bid');
            params.delete('book_id');
            params.set('bid', bid);
            change_page_params(params);
        });
        book_list.append(d);
    }
    /**
     * Add a item to list which only contains book's ID
     * @param {number} bid Book Id
     */
    function add_bookid_only_item(bid) {
        let d = doc.createElement('div');
        d.classList.add('only-id');
        d.append(`${getI18n('bookId')}${bid}`);
        add_item(d, bid);
    }
    /**
     * Add a item to list which only 
     * @param {number} bid Book ID
     * @param {QDChapterInfo} ci Chapter Info
     */
    function add_chapter_only_item(bid, ci) {
        let d = doc.createElement('div');
        d.classList.add('only-chapter');
        d.append(`${getI18n('bookId')}${bid}`);
        d.append(doc.createElement('br'));
        d.append(`${getI18n('bookName')}${ci.bookName()}`);
        d.append(doc.createElement('br'));
        d.append(`${getI18n('authorName')}${ci.authorName()}`);
        add_item(d, bid);
    }
    let book_ids = await get_all_books_id();
    for (let bid of book_ids[1]) {
        let ci = await indexeddb.get_book_info_from_chapter(bid);
        if (ci == null) {
            add_bookid_only_item(bid);
        } else {
            add_chapter_only_item(bid, ci);
        }
    }
    return div;
}

module.exports = {
    get_all_books_id,
    gen_book_list,
}
