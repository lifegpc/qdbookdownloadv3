const { getQDBook, getQdBookGdata, getQdChapterGdata, getQdChapter } = require('./messages');
const { getCurrentTab } = require('./tabs');
const { eval_gdata, eval_fpScript } = require('./eval');
const match_urls = require('./match_urls');
const { QDChapterInfo } = require('./qdchapter_info');
const { getI18n } = require('./i18n');
const { saveBlob } = require('./save_file');
const { get_settings, Settings } = require('./settings');
const indexeddb_qd = require('./db/indexeddb/qd');
const { u8arrcmp } = require('./binary');
const { Zip } = require('./zip/file');
const { ZIP_STORED } = require('./zip/const');
const { QDBookInfo } = require('./qdbook_info');

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
    d.append(`${getI18n('previewChapter')}`);
    d.append(data.previewedContent());
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
        if (data.chapter_cES() == 2) {
            alert(getI18n('use_save_as_zip'));
            return;
        }
        navigator.clipboard.writeText(genText()).catch(() => {
            alert(getI18n('copyFailed'));
        })
    })
    d.append(copyAsTxt);
    let saveAsTxt = doc.createElement('button');
    saveAsTxt.innerText = getI18n('saveAsTxt');
    saveAsTxt.addEventListener('click', () => {
        if (data.chapter_cES() == 2) {
            alert(getI18n("use_save_as_zip"));
            return;
        }
        saveBlob(new Blob([genText()], { type: 'text/plain;charset=utf-8' }), `${data.bookName()}-${data.chapterName()}.txt`);
    })
    d.append(saveAsTxt);
    let saveAsXhtml = doc.createElement('button');
    saveAsXhtml.innerText = getI18n('saveAsXhtml');
    async function save_as_xhtml() {
        if (data.chapter_cES() == 2) {
            alert(getI18n("use_save_as_zip"));
            return;
        }
        saveBlob((await data.toXhtml(settings)).to_blob(), `${data.bookName()}-${data.chapterName()}.xhtml`);
    }
    saveAsXhtml.addEventListener('click', () => {
        save_as_xhtml().catch(e => {
            console.error(e);
            alert(getI18n('saveFailed'));
        });
    })
    d.append(saveAsXhtml);
    let saveToDatabase = doc.createElement('button');
    saveToDatabase.innerText = getI18n('saveToDatabase');
    function save_to_database(key = undefined) {
        indexeddb_qd.save_chapter(data, key).then(() => { alert(getI18n('save_ok')) }).catch(e => { console.error(e); });
    }
    saveToDatabase.addEventListener('click', () => {
        indexeddb_qd.get_latest_chapters_key_by_chapterId(data.chapterId()).then(key => {
            console.log('Latest key:', key);
            if (key) {
                indexeddb_qd.get_chatper(key).then(chapter => {
                    console.log('Latest chapter:', chapter);
                    let is_protected = false;
                    let data_nonmatch = !u8arrcmp(chapter.get_hash(), data.get_hash());
                    if (chapter.chapter_cES() == 2 && data.chapter_cES() == 2) {
                        data_nonmatch = false;
                        is_protected = true;
                    }
                    let eid_nonmatch = chapter.encodedChapterId() !== data.encodedChapterId();
                    let confirmed = data_nonmatch || eid_nonmatch || confirm(`${getI18n('chapter_already_exists_in_db')}${is_protected ? getI18n('chapter_protected_nonmatch') : ""}${getI18n('ask_continue')}`);
                    if (confirmed) {
                        save_to_database((!data_nonmatch && eid_nonmatch) ? key[2] : undefined);
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
    async function save_as_zip() {
        let zip = new Zip();
        let encoder = new TextEncoder();
        if (!data.chapter_cES()) zip.add_file(`${data.bookName()}-${data.chapterName()}.txt`.replaceAll('/', '_'), encoder.encode(genText()));
        zip.add_file(`${data.bookName()}-${data.chapterName()}.xhtml`.replaceAll('/', '_'), encoder.encode((await data.toXhtml(settings, (filename, data) => {
            zip.add_file(filename, data);
        })).to_xhtml()));
        let blob = await zip._toBlob({ 'type': 'application/zip' });
        saveBlob(blob, `${data.bookName()}-${data.chapterName()}.zip`);
    }
    saveAsZip.addEventListener('click', () => {
        save_as_zip().catch(e => {
            console.error(e);
            alert(getI18n('saveFailed'));
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
    if (qdc.chapter_cES() == 2) {
        qdc._data['fpScript'] = await eval_fpScript(qdc._data['fpScript']);
        let con = [];
        /**@type {string | undefined}*/
        let dt = undefined;
        let encodeCss = qdc.encodeCss();
        /**
         * @param {string} tagName 
         */
        function detect_dt(tagName) {
            let otagName = tagName;
            while (tagName.length) {
                tagName = tagName.slice(0, tagName.length - 1);
                if (encodeCss.indexOf(tagName) != -1) {
                    let dt = otagName.slice(tagName.length);
                    if (!dt.match(/^[0-9]+$/)) {
                        break;
                    }
                    console.log('Detect end tag:', dt);
                    return dt;
                }
            }
        }
        for (let t of qdc.contents()) {
            let a = document.createElement('p');
            a.innerHTML = t;
            let c = a.children[0];
            for (let e of c.children) {
                let tagName = e.tagName.toLowerCase();
                if (dt === undefined) {
                    dt = detect_dt(tagName);
                } else {
                    if (!tagName.endsWith(dt)) continue;
                }
                let ele = document.createElement(tagName.slice(0, tagName.length - (dt === undefined ? 0 : dt.length)).toLowerCase());
                ele.innerHTML = e.innerHTML;
                for (let attr of e.getAttributeNames()) {
                    let tattr = attr;
                    if (["class"].indexOf(attr) == -1) {
                        if (dt === undefined) {
                            dt = detect_dt(attr);
                            tattr = attr.slice(0, attr.length - (dt === undefined ? 0 : dt.length));
                        } else {
                            if (tagName.endsWith(dt)) {
                                tattr = attr.slice(0, attr.length - dt.length);
                            }
                        }
                    }
                    ele.setAttribute(tattr, e.getAttribute(attr));
                }
                e.replaceWith(ele);
            }
            con.push(a.innerHTML);
        }
        qdc._data['contents'] = con;
    }
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
        alert(g_data['msg']);
        return;
    }
    g_data = g_data['g_data'];
    g_data = await eval_gdata(g_data);
    let data = await getQDBook(tabId, g_data);
    if (!data['ok']) {
        alert(data['msg']);
        return;
    }
    console.log('Book data:', data['data']);
    let book = new QDBookInfo(g_data, data['data']);
    console.log('Current book:', book);
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
