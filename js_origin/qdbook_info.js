const { structuredClone } = require('./clone');
const parse = require('./json/parse');
const stringify = require('./json/stringify');

class QDBookTag {
    /**
     * Book tag
     * @param {string} name tag name
     * @param {boolean} is_status_tag is a status tag
     * @param {string | undefined} url tag url
     */
    constructor(name, is_status_tag, url = undefined) {
        /**@type {string} tag name*/
        this._name = name;
        /**@type {boolean} is a status tag*/
        this._is_status_tag = is_status_tag;
        /**@type {string | undefined} tag url*/
        this._url = url;
    }
    toJson() {
        let o = { "name": this._name, "type": this._is_status_tag };
        if (this._url !== undefined) {
            o['url'] = this._url;
        }
        return structuredClone(o)
    }

    static fromJson(data) {
        return new QDBookTag(data['name'], data['type'], data['url']);
    }
}

class QDBookInfo {
    constructor(g_data, data) {
        this._g_data = g_data;
        this._data = parse(data, QDBookInfo.get_json_map(), true);
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
        let o = structuredClone({ "g_data": this._g_data, "data": this._data });
        return stringify(o, QDBookInfo.get_json_map(), true, true);
    }
    static fromJson(json) {
        let obj = parse(json, QDBookInfo.get_json_map(), true)
        return new QDBookInfo(obj['g_data'], obj["data"]);
    }
    /**@returns {Object.<string, [()=>void, (data: any) => any, (data: any) => any | undefined, boolean | undefined, boolean | undefined]>}*/
    static get_json_map() {
        return {
            'QDBookTag': [QDBookTag,
            /**@param {QDBookTag} d*/ (d) => d.toJson(), QDBookTag.fromJson, true, true]
        }
    }
}

module.exports = { QDBookTag, QDBookInfo };
