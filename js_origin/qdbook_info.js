const { structuredClone } = require('./clone');

class QDBookInfo {
    constructor(g_data, data) {
        this._g_data = g_data;
        this._data = data;
    }
    /**@returns {number}*/
    bookId() {
        return this._g_data['pageJson']['bookId'];
    }
    /**@returns {number}*/
    bookType() {
        return this._g_data["pageJson"]["bookType"];
    }
    /**@returns {number}*/
    authorId() {
        return parseInt(this._g_data["pageJson"]["authorInfo"]["authorId"]);
    }
    /**@returns {string}*/
    authorName() {
        return this._g_data["pageJson"]["authorInfo"]["authorName"];
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
    toJson() {
        return structuredClone({ "g_data": this._g_data, "data": this._data });
    }
    static fromJson(json) {
        return new QDBookInfo(json['g_data'], json["data"]);
    }
}

module.exports = { QDBookInfo };
