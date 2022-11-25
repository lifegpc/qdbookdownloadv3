const indexeddb = require('../db/indexeddb/qd');
const { getI18n } = require('../i18n');
const { QDChapterInfo } = require('../qdchapter_info');

/**
 * @param {QDChapterInfo} ci
 * @param {Document} doc
 */
function render_chapter_only_book_info(ci, doc) {
    let d = doc.createElement('div');
    d.classList.add('only-chapter');
    d.append(`${getI18n('bookId')}${ci.bookId()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('bookName')}${ci.bookName()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('authorName')}${ci.authorName()}`);
    return d;
}

/**
 * 
 * @param {number} bid Book id
 * @param {Document} doc Document
 */
async function gen_qd_book(bid, doc = document) {
    let div = doc.createElement('div');
    let binfo = await indexeddb.get_book_info(bid);
    if (binfo === undefined) {
        let ci = await indexeddb.get_book_info_from_chapter(bid);
        if (ci === null) {
            div.innerText = getI18n('no_data_in_db');
            return div;
        }
        div.append(render_chapter_only_book_info(ci, doc));
    }
    return div;
}

module.exports = { gen_qd_book }; 
