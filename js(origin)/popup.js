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
    return d;
}

window.addEventListener('load', () => {
    getCurrentTab().then((tab) => {
        let tabId = tab['id'];
        let url = tab['url'];
        document.getElementById('main').style.width = tab['width'] / 2;
        let re = match_urls.match_url(url);
        if (re == match_urls.QD_CHAPTER) {
            getQdChapterGdata(tabId).then((data) => {
                if (data['ok']) {
                    let g_data = data['g_data'];
                    eval_gdata(g_data).then((g_data) => {
                        getQdChapter(tabId, g_data).then((data) => {
                            if (data["code"] == 0) {
                                let qdc = new QDChapterInfo(g_data, data["data"]);
                                document.getElementById('main').append(generate_book_info(qdc));
                            }
                        });
                    });
                }
            });
        }
    });
})
