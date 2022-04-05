const { getI18n } = require('./i18n');
const { structuredClone } = require('./clone');
const { XHtml } = require('./epub/xhtml')
const { Settings } = require('./settings')

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
            this.contents().forEach((v) => {
                this._real_words += v.trim().length;
            });
        }
        return this._real_words;
    }
    toJson() {
        return structuredClone({'g_data': this._g_data, 'data': this._data});
    }
    static fromJson(json) {
        return new QDChapterInfo(json['g_data'], json['data']);
    }
    /**
     * Convert to XHTML
     * @param {Settings} settings Settings
     */
    toXhtml(settings) {
        let x = new XHtml(settings);
        let title = x.doc.createElement('title');
        title.innerText = this.chapterName();
        x.doc.head.append(title);
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
        this.contents().forEach((p) => {
            let pd = x.doc.createElement('p');
            pd.innerText = p;
            x.doc.body.append(pd);
        })
        return x;
    }
}

module.exports = { QDChapterInfo };
