const { getI18n } = require('./i18n');
const { structuredClone } = require('./clone');
const { XHtml } = require('./epub/xhtml')
const { Settings } = require('./settings')
const { hash: md5 } = require('./hash/md5');

class QDChapterInfo {
    constructor(g_data, data = undefined) {
        this._g_data = g_data;
        this._data = data || {};
        this._real_words = undefined;
    }
    /**@returns {number}*/
    autoBuy() {
        return this._g_data['readSetting']['autoBuy'];
    }
    /**@returns {boolean}*/
    isPublication() {
        return this._g_data["isPublication"];
    }
    /**@returns {number}*/
    bookId() {
        return this._g_data["bookInfo"]["bookId"] || this._g_data["pageJson"]["bookId"];
    }
    /**@returns {string}*/
    bookName() {
        return this._g_data["bookInfo"]["bookName"];
    }
    /**@returns {number}*/
    authorId() {
        return this._g_data["bookInfo"]["authorId"];
    }
    /**@returns {string}*/
    authorName() {
        return this._g_data["bookInfo"]["authorName"];
    }
    /**@returns {number}*/
    chapterId() {
        return this._g_data["chapter"]["id"];
    }
    /**@returns {string | undefined} */
    encodedChapterId() {
        return this._data['eid'];
    }
    /**@returns {number}*/
    vipStatus() {
        return this._g_data["chapter"]["vipStatus"];
    }
    /**@returns {number}*/
    prevChapterId() {
        return this._g_data["chapter"]["prevId"];
    }
    /**@returns {number}*/
    nextChapterId() {
        return this._g_data["chapter"]["nextId"];
    }
    /**@returns {number}*/
    isBuy() {
        return this._g_data["chapter"]["isBuy"];
    }
    /**@returns {number}*/
    isContentEncode() {
        return this._g_data["isContentEncode"];
    }
    /**@returns {number}*/
    banId() {
        return this._g_data["riskInfo"]["banId"];
    }
    /**@returns {boolean}*/
    isBanned() {
        return !!this.banId();
    }
    /**@returns {number} 下个章节是否为VIP章节*/
    nextChapterVip() {
        return this._g_data["nextChapterVip"];
    }
    /**@returns {number}*/
    isVipBook() {
        return this._g_data["pageJson"]["isVip"];
    }
    /**@returns {boolean} 是否为出版物*/
    isPublicationBook() {
        return this._g_data["pageJson"]["isPublication"];
    }
    /**@returns {number}*/
    isLogin() {
        return this._g_data["pageJson"]["isLogin"];
    }
    /**@returns {number} 是否已签约*/
    isSignBook() {
        return this._g_data["pageJson"]["isSign"];
    }
    /**@returns {string} 签约状态*/
    signStatus() {
        return this._g_data["pageJson"]["signStatus"];
    }
    /**@returns {number} 用于区分起点中文网(1)和女生网*/
    isWebSiteType() {
        return this._g_data["isWebSiteType"];
    }
    webSiteType() {
        return this.isWebSiteType() == 1 ? getI18n('qidian') : getI18n('qidianwomen');
    }
    /**@returns {string}*/
    chapterName() {
        return this._data["name"];
    }
    /**@returns {Array<string>}*/
    contents() {
        return this._data["contents"];
    }
    previewedContent() {
        let cES = this.chapter_cES();
        if (cES == 0) {
            return this.contents()[0];
        } else if (cES == 2) {
            return getI18n('not_support_preview')
        }
        return ''
    }
    /**@returns {number}*/
    words() {
        return this._data["words"];
    }
    /**@returns {string}*/
    uploadTime() {
        return this._data["uploadTime"];
    }
    /**@returns {number}*/
    realWords() {
        if (this._real_words === undefined) {
            this._real_words = 0;
            let cES = this.chapter_cES();
            if (cES == 0) {
                this.contents().forEach((v) => {
                    this._real_words += v.trim().length;
                });
            } else if (cES == 2) {
                let a = document.createElement('div');
                this.contents().forEach(v => {
                    a.innerHTML = v;
                    let tmp = 0;
                    for (let e of a.children) {
                        let have_attr = false;
                        for (let attr of e.getAttributeNames()) {
                            let value = e.getAttribute(attr);
                            if (value !== null && value.length) {
                                have_attr = true;
                            }
                        }
                        if (have_attr) {
                            tmp += 1;
                        }
                    }
                    this._real_words += a.innerText.trim().length + tmp;
                })
            }
        }
        return this._real_words;
    }
    get_hash() {
        let s = `${this.bookId()}\n${this.bookName()}\n${this.authorId()}\n${this.authorName()}\n${this.chapterId()}\n${this.vipStatus()}\n${this.isBuy()}\n${this.uploadTime()}\n${this.chapterName()}\n${this.contents().join('\n')}`;
        return md5(new TextEncoder().encode(s));
    }
    toJson() {
        return structuredClone({ 'g_data': this._g_data, 'data': this._data });
    }
    static fromJson(json) {
        return new QDChapterInfo(json['g_data'], json['data']);
    }
    /**@returns {number} 0 is unprotected, 2 is protected*/
    chapter_cES() {
        return this._g_data['chapter']['cES'];
    }
    /**@returns {string}*/
    encodeCss() {
        return this._data['fpScript']['encodeCss'];
    }
    /**@returns {Uint8Array}*/
    randomFont() {
        return this._data['fpScript']['randomFont'];
    }
    /**@returns {string} */
    fixedFontTtf() {
        return this._data['fpScript']['fixedFontTtf'];
    }
    /**
     * Convert to XHTML
     * @param {Settings} settings Settings
     * @param {(filename: string, data: Uint8Array) => void | undefined} callback Font file callback
     */
    async toXhtml(settings, callback = undefined) {
        let x = new XHtml(settings);
        let title = x.doc.createElement('title');
        title.innerText = this.chapterName();
        x.doc.head.append(title);
        let eCS = this.chapter_cES();
        if (eCS == 2) {
            x._skip_strip = true;
            let randomFontName = `j${this.chapterId()}.ttf`;
            if (callback != undefined) {
                callback(randomFontName, this.randomFont());
            }
            let fixedFontTtfRe = await fetch(this.fixedFontTtf());
            let fixedFontTtf = new Uint8Array(await fixedFontTtfRe.arrayBuffer());
            let fixedFontTtfName = new URL(this.fixedFontTtf()).pathname.split('/').pop();
            if (fixedFontTtfName === undefined || !fixedFontTtfName.length) {
                fixedFontTtfName = `j${this.chapterId()}-ttf.ttf`;
            }
            if (callback != undefined) {
                callback(fixedFontTtfName, fixedFontTtf);
            }
            let style = x.doc.createElement('style');
            style.innerHTML = `@font-face {
font-family: "rj${this.chapterId()}";
src: url("${randomFontName}");
}
@font-face {
font-family: "j${this.chapterId()}";
src: url("${fixedFontTtfName}");
}
#j${this.chapterId()} p {
display: flex;
flex-wrap: wrap;
align-items: flex-end;
}
${this.encodeCss()}`;
            x.doc.head.append(style);
        }
        let h1 = x.doc.createElement('h1');
        h1.innerText = this.chapterName();
        x.doc.documentElement.setAttribute('xml:lang', 'zh-Hans-CN');
        x.doc.body.append(h1);
        if (settings.add_more_info_to_xhtml) {
            let p = x.doc.createElement('p');
            p.innerText = `${getI18n('wordCount')}${this.words()}(${this.realWords()})`;
            p.append(x.doc.createElement('br'));
            p.append(`${getI18n('uploadTime')}${this.uploadTime()}`);
            x.doc.body.append(p);
        }
        if (eCS == 0) {
            this.contents().forEach((p) => {
                let pd = x.doc.createElement('p');
                pd.innerText = p;
                x.doc.body.append(pd);
            })
        } else if (eCS == 2) {
            let div = x.doc.createElement('div');
            div.id = `j${this.chapterId()}`;
            div.innerHTML = this.contents().join('\n');
            div.style.fontFamily = `rj${this.chapterId()}, j${this.chapterId()}`;
            x.doc.body.append(div);
        }
        return x;
    }
}

module.exports = { QDChapterInfo };
