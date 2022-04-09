const indexeddb = require('../db/indexeddb/qd');

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

module.exports = {
    get_all_books_id,
}
