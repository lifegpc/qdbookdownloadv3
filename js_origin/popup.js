const { getQdBookGdata, getQdChapterGdata, getQdChapter } = require('./messages');
const { getCurrentTab } = require('./tabs');
const { eval_gdata } = require('./eval');
const match_urls = require('./match_urls');
const { QDChapterInfo } = require('./qdchapter_info');
const { getI18n } = require('./i18n');
const { saveBlob } = require('./save_file');
const { get_settings, Settings } = require('./settings');
const indexeddb_qd = require('./db/indexeddb/qd');
const { u8arrcmp } = require('./binary');
const { Zip } = require('./zip/file');
const { ZIP_STORED } = require('./zip/const');

/**
 * @param {QDChapterInfo} data Chapter info
 * @param {Settings} settings Settings
 */
function generate_book_info(data, settings, doc = document) {
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
    if (data.prevChapterId() > -1) {
        d.append(doc.createElement('br'));
        d.append(`${getI18n('prevChapterId')}${data.prevChapterId()}`);
    }
    if (data.nextChapterId() > -1) {
        d.append(doc.createElement('br'));
        d.append(`${getI18n('nextChapterId')}${data.nextChapterId()}`);
    }
    d.append(doc.createElement('br'));
    function genText() {
        return `${data.chapterName()}\n${getI18n('wordCount')}${data.words()}(${data.realWords()})\n${getI18n('uploadTime')}${data.uploadTime()}\n${data.contents().join('\n')}`;
    }
    let copyAsTxt = doc.createElement('button');
    copyAsTxt.innerText = getI18n('copyAsTxt');
    copyAsTxt.addEventListener('click', () => {
        navigator.clipboard.writeText(genText()).catch(() => {
            alert(getI18n('copyFailed'));
        })
    })
    d.append(copyAsTxt);
    let saveAsTxt = doc.createElement('button');
    saveAsTxt.innerText = getI18n('saveAsTxt');
    saveAsTxt.addEventListener('click', () => {
        saveBlob(new Blob([genText()], { type: 'text/plain;charset=utf-8' }), `${data.bookName()}-${data.chapterName()}.txt`);
    })
    d.append(saveAsTxt);
    let saveAsXhtml = doc.createElement('button');
    saveAsXhtml.innerText = getI18n('saveAsXhtml');
    saveAsXhtml.addEventListener('click', () => {
        saveBlob(data.toXhtml(settings).to_blob(), `${data.bookName()}-${data.chapterName()}.xhtml`);
    })
    d.append(saveAsXhtml);
    let saveToDatabase = doc.createElement('button');
    saveToDatabase.innerText = getI18n('saveToDatabase');
    function save_to_database() {
        indexeddb_qd.save_chapter(data).then(() => { alert(getI18n('save_ok')) }).catch(e => { console.error(e); });
    }
    saveToDatabase.addEventListener('click', () => {
        indexeddb_qd.get_latest_chapters_key_by_chapterId(data.chapterId()).then(key => {
            console.log('Latest key:', key);
            if (key) {
                indexeddb_qd.get_chatper(key).then(chapter => {
                    console.log('Latest chapter:', chapter);
                    let confirmed = !u8arrcmp(chapter.get_hash(), data.get_hash()) || confirm(`${getI18n('chapter_already_exists_in_db')}${getI18n('ask_continue')}`);
                    if (confirmed) {
                        save_to_database();
                    }
                })
            } else {
                save_to_database();
            }
        })
    })
    d.append(saveToDatabase);
    let saveAsZip = doc.createElement('button');
    saveAsZip.innerText = getI18n('saveAsZip');
    saveAsZip.addEventListener('click', () => {
        let zip = new Zip();
        let encoder = new TextEncoder();
        zip.add_file(`${data.bookName()}-${data.chapterName()}.txt`, encoder.encode(genText()));
        zip.add_file(`${data.bookName()}-${data.chapterName()}.xhtml`, encoder.encode(data.toXhtml(settings).to_xhtml()));
        zip._toBlob({ 'type': 'application/zip' }).then((blob) => {
            saveBlob(blob, `${data.bookName()}-${data.chapterName()}.zip`);
        }).catch(e => {
            console.error(e);
        })
    })
    d.append(saveAsZip);
    return d;
}

/**
 * @param {number} tabId Tab id
 * @param {Settings} settings Settings
 */
async function load_qd_chapter_info(tabId, settings) {
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
    console.log('Current chapter:', qdc);
    document.getElementById('main').append(generate_book_info(qdc, settings));
}

/**
 * @param {number} tabId Tab id
 * @param {Settings} settings Settings
 */
async function load_qd_book_info(tabId, settings) {
    let g_data = await getQdBookGdata(tabId);
    if (!g_data['ok']) {
        throw new Error(g_data['msg']);
    }
    g_data = g_data['g_data'];
    g_data = await eval_gdata(g_data);
}

async function basic_handle() {
    let settings = await get_settings();
    let tab = await getCurrentTab();
    let tabId = tab['id'];
    let url = tab['url'];
    document.getElementById('main').style.width = tab['width'] / 2;
    let re = match_urls.match_url(url);
    if (re == match_urls.QD_CHAPTER) {
        await load_qd_chapter_info(tabId, settings);
    } else if (re == match_urls.QD_BOOK) {
        await load_qd_book_info(tabId, settings);
    }
}

window.addEventListener('load', () => {
    basic_handle().catch(e => {
        console.error(e);
    })
})
