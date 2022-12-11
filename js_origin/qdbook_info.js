const { structuredClone } = require('./clone');
const parse = require('./json/parse');
const stringify = require('./json/stringify');
const { split_filename } = require('./zip/utils');

class QDChapter {
    /**
     * @param {string} title Chapter title
     * @param {string | undefined} url Chapter's url
     * @param {number | undefined} id Chapter's id
     * @param {Date | undefined} upload_time Chapter's upload time
     * @param {number | undefined} word_count Chapter's word count
     * @param {boolean} is_locked Chapter is locked or not
     */
    constructor(title, url = undefined, id = undefined, upload_time = undefined, word_count = undefined, is_locked = false) {
        /**@type {string} Chapter title*/
        this._title = title;
        /**@type {string | undefined} Chapter's url*/
        this._url = url;
        /**@type {number | undefined} Chapter's id*/
        this._id = id;
        /**@type {Date | undefined} Chapter's upload time*/
        this._upload_time = upload_time;
        /**@type {number | undefined} Chapter's word count*/
        this._word_count = word_count;
        /**@type {boolean} Chapter is locked or not*/
        this._is_locked = is_locked;
        this._try_get_id = true;
    }
    chapterId() {
        if (this._id === undefined) {
            if (this._try_get_id) {
                let tmp = split_filename(this._url).pop();
                if (tmp !== undefined) {
                    if (/^\d+$/.test(tmp)) {
                        this._id = parseInt(tmp);
                    }
                }
                this._try_get_id = false;
            }
        }
        return this._id;
    }
    toJson() {
        let o = { 'title': this._title };
        if (this._url != undefined) o['url'] = this._url;
        if (this._id != undefined) o['id'] = this._id;
        if (this._upload_time != undefined) o['upload_time'] = this._upload_time;
        if (this._word_count != undefined) o['word_count'] = this._word_count;
        if (this._is_locked) o['locked'] = true;
        return structuredClone(o);
    }
    static fromJson(data) {
        let o = new QDChapter(data['title'], data['url'], data['id'], data['upload_time'], data['word_count'], data['locked']);
        if (typeof o._upload_time == "string") o._upload_time = new Date(o._upload_time);
        return o;
    }
}

class QDVolume {
    /**
     * @param {string} name Volume name
     * @param {boolean} is_vip Whether the volume is VIP volume
    */
    constructor(name, is_vip) {
        /**@type {string} Volume name*/
        this._name = name;
        /**@type {boolean} Whether the volume is VIP volume*/
        this._is_vip = is_vip;
        /**@type {Array<QDChapter>} */
        this._chapters = [];
    }
    toJson() {
        return { 'name': this._name, 'vip': this._is_vip, 'chapters': this._chapters };
    }
    static fromJson(data) {
        let o = new QDVolume(data['name'], data['vip']);
        o._chapters = data['chapters'];
        return o
    }
}

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
    /**@returns {Array<QDVolume>} */
    volumes() {
        return this._data['volumes'];
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
            /**@param {QDBookTag} d*/ (d) => d.toJson(), QDBookTag.fromJson, true, true],
            'QDVolume': [QDVolume, /**@param {QDVolume} d*/ (d) => d.toJson(), QDVolume.fromJson],
            'QDChapter': [QDChapter, /**@param {QDChapter} d*/ (d) => d.toJson(), QDChapter.fromJson, true, true],
        }
    }
}

module.exports = { QDBookTag, QDBookInfo, QDChapter, QDVolume };
