const { getQdChapterGdata, getQdChapter } = require('./messages');
const { getCurrentTab } = require('./tabs');
const { eval_gdata } = require('./eval');
const match_urls = require('./match_urls');
const { QDChapterInfo } = require('./qdchapter_info');
const { getI18n } = require('./i18n');

/**
 * @param {QDChapterInfo} data Chapter info
 */
function generate_book_info(data, doc = document) {
    let d = doc.createElement('div');
    d.append(`${getI18n('siteName')}${data.webSiteType()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('chapterName')}${data.chapterName()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('wordCount')}${data.words()} (${data.realWords()})`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('uploadTime')}${data.uploadTime()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('previewChapter')}${data.contents()[0].trim()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('chapterId')}${data.chapterId()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('vipStatus')}${data.vipStatus() ? getI18n('paid') : getI18n('free')}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('autoBuy')}${data.autoBuy() ? getI18n('enabled') : getI18n('disabled')}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('bookName')}${data.bookName()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('bookId')}${data.bookId()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('authorName')}${data.authorName()}`);
    d.append(doc.createElement('br'));
    d.append(`${getI18n('authorId')}${data.authorId()}`);
    return d;
}

/**
 * @param {number} tabId Tab id
 */
async function load_qd_book_info(tabId) {
    let g_data = await getQdChapterGdata(tabId);
    if (!g_data['ok']) {
        throw new Error(g_data['msg']);
    }
    g_data = g_data['g_data'];
    g_data = await eval_gdata(g_data);
    let data = await getQdChapter(tabId, g_data);
    if (data['code']) {
        throw new Error(data['code']);
    }
    let qdc = new QDChapterInfo(g_data, data['data']);
    document.getElementById('main').append(generate_book_info(qdc));
}

window.addEventListener('load', () => {
    getCurrentTab().then((tab) => {
        let tabId = tab['id'];
        let url = tab['url'];
        document.getElementById('main').style.width = tab['width'] / 2;
        let re = match_urls.match_url(url);
        if (re == match_urls.QD_CHAPTER) {
            load_qd_book_info(tabId);
        }
    });
})
