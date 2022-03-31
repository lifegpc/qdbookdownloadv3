const QD_CHAPTER_RE = /^https?:\/\/([a-zA-Z0-9-]+\.)*qidian\.com\/chapter\//;
const NO_MATCH = 0;
const QD_CHAPTER = 1;

/**
 * @param {string} u
 */
function match_url(u) {
    if (QD_CHAPTER_RE.test(u)) {
        return QD_CHAPTER;
    }
    return NO_MATCH;
}

module.exports = { NO_MATCH, QD_CHAPTER, match_url }
