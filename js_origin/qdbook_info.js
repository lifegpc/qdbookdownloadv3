const { structuredClone } = require('./clone');
const { getI18n } = require('./i18n');
const parse = require('./json/parse');
const stringify = require('./json/stringify');
const { QDChapterInfo } = require('./qdchapter_info');
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
        /**@type {string | undefined} Encoded chapter id*/
        this._eid = undefined;
        /**@type {boolean | undefined} The chapter is vip or not*/
        this._is_vip = undefined;
    }
    try_get_id() {
        if (this._try_get_id) {
            if (this._url !== undefined) {
                let tmp = split_filename(this._url).pop();
                if (tmp !== undefined) {
                    if (/^\d+$/.test(tmp)) {
                        this._id = parseInt(tmp);
                    } else {
                        this._eid = tmp;
                    }
                }
            }
            this._try_get_id = false;
        }
    }
    chapterId() {
        if (this._id === undefined) {
            this.try_get_id();
        }
        return this._id;
    }
    encodedChapterId() {
        if (this._eid === undefined) {
            this.try_get_id();
        }
        return this._eid;
    }
    toJson() {
        let o = { 'title': this._title };
        if (this._url != undefined) o['url'] = this._url;
        if (this._id != undefined) o['id'] = this._id;
        if (this._upload_time != undefined) o['upload_time'] = this._upload_time;
        if (this._word_count != undefined) o['word_count'] = this._word_count;
        if (this._is_locked) o['locked'] = true;
        if (this._eid != undefined) o['eid'] = this._eid;
        if (this._is_vip !== undefined) o['vip'] = this._is_vip;
        return structuredClone(o);
    }
    static fromJson(data) {
        let o = new QDChapter(data['title'], data['url'], data['id'], data['upload_time'], data['word_count'], data['locked']);
        if (typeof o._upload_time == "string") o._upload_time = new Date(o._upload_time);
        let eid = data['eid'];
        if (typeof eid == "string") o._eid = eid;
        let vip = data['vip'];
        if (typeof vip == "boolean") o._is_vip = vip;
        return o;
    }
    /**
     * Compare chapter's id
     * @param {QDChapter} ch Another chapter
     * @returns {boolean} true if is same chapter
     */
    _equal(ch) {
        let id1 = this.chapterId();
        let id2 = ch.chapterId();
        if (id1 !== undefined && id2 !== undefined && id1 === id2) {
            return true;
        }
        let eid1 = this.encodedChapterId();
        let eid2 = ch.encodedChapterId();
        if (eid1 !== undefined && eid2 !== undefined && eid1 === eid2) {
            return true;
        }
        return false;
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
        /**@type {number | null} word count */
        this._word_count = null;
        /**@type {number | null} 免费章节字数*/
        this._free_word = null;
        /**@type {number | null} 已购买章节字数*/
        this._buyed_word = null;
        /**@type {number | null} 未购买章节字数*/
        this._locked_word = null;
        /**@type {number | null} 无法判断是免费或者已购买的章节字数*/
        this._unknown_word = null;
    }
    buyedWordCount() {
        this.calwords();
        return this._buyed_word;
    }
    freeWordCount() {
        this.calwords();
        return this._free_word;
    }
    lockedWordCount() {
        this.calwords();
        return this._locked_word;
    }
    unknownWordCount() {
        this.calwords();
        return this._unknown_word;
    }
    wordCount() {
        this.calwords();
        return this._word_count;
    }
    calwords() {
        if (this._word_count === null) {
            this._word_count = 0;
            this._free_word = 0;
            this._buyed_word = 0;
            this._locked_word = 0;
            this._unknown_word = 0;
            for (let ch of this._chapters) {
                if (ch._word_count === undefined) continue;
                this._word_count += ch._word_count;
                if (ch._is_locked) {
                    this._locked_word += ch._word_count;
                } else if (ch._is_vip === true) {
                    this._buyed_word += ch._word_count;
                } else if (ch._is_vip === false) {
                    this._free_word += ch._word_count;
                } else {
                    this._unknown_word += ch._word_count;
                }
            }
        }
    }
    toJson() {
        return { 'name': this._name, 'vip': this._is_vip, 'chapters': this._chapters };
    }
    static fromJson(data) {
        let o = new QDVolume(data['name'], data['vip']);
        o._chapters = data['chapters'];
        return o
    }
    _simple_clone() {
        return new QDVolume(this._name, this._is_vip);
    }
    /**
     * @param {QDVolume} volume
     */
    _equal(volume) {
        return this._name === volume._name && this._is_vip === volume._is_vip;
    }
    /**
     * @param {QDChapter} ch
     * @returns index
     */
    findChapter(ch) {
        for (let i = 0; i < this._chapters.length; i++) {
            if (this._chapters[i]._equal(ch)) {
                return i;
            }
        }
        return null;
    }
}

class QDBookTag {
    /**
     * Book tag
     * @param {string} name tag name
     * @param {number} type 0 is a status tag, 1 is genre tag, 2 is author defined tag
     * @param {string | undefined} url tag url
     */
    constructor(name, type, url = undefined) {
        /**@type {string} tag name*/
        this._name = name;
        /**@type {number} 0 is a status tag, 1 is genre tag, 2 is author defined tag*/
        this._type = type;
        /**@type {string | undefined} tag url*/
        this._url = url;
    }
    toJson() {
        let o = { "name": this._name, "type": this._type };
        if (this._url !== undefined) {
            o['url'] = this._url;
        }
        return structuredClone(o)
    }

    generate_html(doc = document) {
        if (this._url !== undefined) {
            let a = doc.createElement('a');
            a.href = this._url;
            a.innerText = this._name;
            return a;
        }
        return this._name;
    }

    static fromJson(data) {
        return new QDBookTag(data['name'], data['type'], data['url']);
    }
}

class QDBookInfo {
    constructor(g_data, data, skip_parse = false) {
        this._g_data = g_data;
        this._data = skip_parse ? data : parse(data, QDBookInfo.get_json_map(), true);
    }
    /**@returns {number}*/
    bookId() {
        return this._g_data['pageJson']['bookId'];
    }
    /**@returns {string | null} */
    bookDesc() {
        return this._data["full_intro"];
    }
    /**@returns {string | null}*/
    bookName() {
        return this._data['name'];
    }
    /**@returns {string | null}*/
    bookIntro() {
        return this._data["intro"];
    }
    /**@returns {Array<QDBookTag> | null} */
    bookTags() {
        return this._data["tags"];
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
    /**
     * @param {QDChapter} ch
     * @returns {[number, number]} index
     */
    findChapter(ch) {
        let volumes = this.volumes();
        if (volumes === undefined) return null;
        for (let i = 0; i < volumes.length; i++) {
            let re = volumes[i].findChapter(ch);
            if (re !== null) return [i, re];
        }
        return null;
    }
    /**
     * @param {QDVolume} vol Volume
     * @returns index
     */
    findVolume(vol) {
        let volumes = this.volumes();
        if (volumes === undefined) return null;
        for (let i = 0; i < volumes.length; i++) {
            if (volumes[i]._equal(vol)) {
                return i;
            }
        }
        return null;
    }
    /**
     * Merge book's catalog
     * @param {QDBookInfo} info Book info
     */
    merge_catalog(info) {
        let ivolumes = info.volumes();
        let mvolumes = this.volumes();
        if (ivolumes === undefined) return;
        if (mvolumes === undefined || !mvolumes.length) {
            this._data['volumes'] = ivolumes;
            return;
        }
        /**@type {number | null} */
        let vindex = null;
        /**@type {number | null} */
        let index = null;
        for (let i = 0; i < mvolumes.length; i++) {
            let vol = mvolumes[i];
            let nvindex = info.findVolume(vol);
            let tvol = nvindex === null ? vol._simple_clone() : ivolumes[nvindex];
            /// Insert the volume if it not exists
            if (nvindex === null) {
                if (vindex === null) {
                    ivolumes.unshift(tvol);
                    nvindex = 0;
                } else {
                    ivolumes.splice(vindex + 1, 0, tvol);
                    nvindex = vindex + 1;
                }
            }
            index = null;
            vindex = nvindex;
            for (let j = 0; j < vol._chapters.length; j++) {
                let ch = vol._chapters[j];
                let nindex = info.findChapter(ch);
                /// Chapter can not be found in catalog
                if (nindex === null) {
                    /// Insert the chapter
                    if (index === null) {
                        tvol._chapters.unshift(ch);
                        nindex = [nvindex, 0]
                    } else {
                        tvol._chapters.splice(index + 1, 0, ch);
                        nindex = [nvindex, index + 1];
                    }
                } else if (nindex[0] !== vindex) {
                    let och = ivolumes[nindex[0]]._chapters.splice(nindex[1], 1)[0];
                    if (index === null) {
                        tvol._chapters.unshift(och);
                        nindex = [nvindex, 0]
                    } else {
                        tvol._chapters.splice(index + 1, 0, och);
                        nindex = [nvindex, index + 1];
                    }
                }
                index = nindex[1];
            }
        }
        this._data['volumes'] = ivolumes.filter(vol => vol._chapters.length > 0);
    }
    /**
     * @param {(key: [number, number, Date]) => Promise<QDChapterInfo | undefined>} get_chatper 
     * @param {(eid: string) => Promise<[number, number, Date] | undefined>} get_latest_chapters_key_by_eid 
     * @param {(id: number) => Promise<[number, number, Date] | undefined>} get_latest_chapters_key_by_chapterId
     */
    async update_catalog(get_chatper, get_latest_chapters_key_by_eid, get_latest_chapters_key_by_chapterId) {
        let volumes = this.volumes();
        if (volumes != undefined) {
            for (let vol of volumes) {
                for (let ch of vol._chapters) {
                    if (!vol._is_vip && ch._is_vip === undefined) {
                        ch._is_vip = false;
                    }
                    if (ch._is_locked && ch._is_vip === undefined) {
                        ch._is_vip = true;
                    }
                    let id = ch.chapterId();
                    if (id === undefined) {
                        let eid = ch.encodedChapterId();
                        if (eid !== undefined) {
                            let key = await get_latest_chapters_key_by_eid(eid);
                            if (key !== undefined) {
                                let cc = await get_chatper(key);
                                if (cc !== undefined) {
                                    ch._id = cc.chapterId();
                                    if (ch._is_vip === undefined) ch._is_vip = cc.vipStatus() ? true : false;
                                }
                            }
                        }
                    } else {
                        if (ch._is_vip !== undefined) continue;
                        let key = await get_latest_chapters_key_by_chapterId(id);
                        if (key !== undefined) {
                            let cc = await get_chatper(key);
                            if (cc !== undefined) {
                                ch._is_vip = cc.vipStatus() ? true : false;
                            }
                        }
                    }
                }
            }
        }
    }
    toJson() {
        return stringify({ "g_data": this._g_data, "data": this._data }, QDBookInfo.get_json_map(), true, true);
    }
    static fromJson(json) {
        let obj = parse(json, QDBookInfo.get_json_map(), true)
        return new QDBookInfo(obj['g_data'], obj["data"], true);
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
