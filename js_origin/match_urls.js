const QD_CHAPTER_RE = /^https?:\/\/([a-zA-Z0-9-]+\.)*qidian\.com\/chapter\//;
const QD_BOOK_RE = /^https?:\/\/([a-zA-Z0-9-]+\.)*qidian\.com\/info\//;
const NO_MATCH = 0;
const QD_CHAPTER = 1;
const QD_BOOK = 2;

/**
 * @param {string} u
 */
function match_url(u) {
    if (QD_CHAPTER_RE.test(u)) {
        return QD_CHAPTER;
    }
    if (QD_BOOK_RE.test(u)) {
        return QD_BOOK;
    }
    return NO_MATCH;
}

module.exports = { NO_MATCH, QD_CHAPTER, QD_BOOK, match_url }
