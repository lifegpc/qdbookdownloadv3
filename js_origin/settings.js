const { browser } = require('./const');

const MAJOR_VERSION = /^(\d+)([\.-].*)?$/
const MINOR_VERSION = /^\d+[\.-](\d+)([\.-].*)?$/
const PATCH_VERSION = /^(?:\d+[\.-]){2}(\d+)([\.-].*)?$/
const REVISION_VERSION = /^(?:\d+[\.-]){3}(\d+)([\.-].*)?$/
/**@type {string}*/
const CUR_VERSION = browser['runtime']['getManifest']()['version'];

class Version {
    constructor(version) {
        this._version = version;
        this._major = undefined;
        this._minor = undefined;
        this._patch = undefined;
        this._revision = undefined;
    }
    get major() {
        if (this._major === undefined) {
            let re = this._version.match(MAJOR_VERSION);
            if (re) {
                this._major = parseInt(re[1]);
            } else {
                this._major = 0;
            }
        }
        return this._major;
    }
    get minor() {
        if (this._minor === undefined) {
            let re = this._version.match(MINOR_VERSION);
            if (re) {
                this._minor = parseInt(re[1]);
            } else {
                this._minor = 0;
            }
        }
        return this._minor;
    }
    get patch() {
        if (this._patch === undefined) {
            let re = this._version.match(PATCH_VERSION);
            if (re) {
                this._patch = parseInt(re[1]);
            } else {
                this._patch = 0;
            }
        }
        return this._patch;
    }
    get revision() {
        if (this._revision === undefined) {
            let re = this._version.match(REVISION_VERSION);
            if (re) {
                this._revision = parseInt(re[1]);
            } else {
                this._revision = 0;
            }
        }
        return this._revision;
    }
    /**
     * Compare with another version
     * @param {Version|string} v another version
     * @returns {number} -1 anthoer version is bigger 0 same 1 this version is bigger
     */
    cmp(v) {
        if (typeof v == "string") {
            v = new Version(v);
        }
        if (v.major > this.major) {
            return -1;
        }
        if (v.major < this.major) {
            return 1;
        }
        if (v.minor > this.minor) {
            return -1;
        }
        if (v.minor < this.minor) {
            return 1;
        }
        if (v.patch > this.patch) {
            return -1;
        }
        if (v.patch < this.patch) {
            return 1;
        }
        if (v.revision > this.revision) {
            return -1;
        }
        if (v.revision < this.revision) {
            return 1;
        }
        return 0;
    }
}

class Settings {
    constructor(data, area) {
        this._data = data;
        this._area = area || "sync";
        this._need_save = false;
        this._is_saving = false;
        this._add_listener();
    }
    _add_listener() {
        let storage = browser["storage"];
        storage["onChanged"]["addListener"]((changes, area) => {this._change_callback(changes, area)})
    }
    _change_callback(changes, area) {
        if (area == this._area && !this._is_saving) {
            let changedItems = Object.keys(changes);
            for (let item of changedItems) {
                let newValue = changes[item]['newValue'];
                let oldValue = changes[item]['oldValue'];
                if (newValue == undefined) {
                    delete this._data[item];
                } else {
                    this._data[item] = newValue;
                }
                console.log(`${item} was changed from ${oldValue} to ${newValue}`);
            }
            this.validate().then(() => { console.log(this._data); });
        }
    }
    _check_data() {
        this._need_save = false;
        if (this.version == undefined) {
            this._data["version"] = CUR_VERSION;
            this._need_save = true;
        }
    }
    /**@returns {boolean}*/
    _get_bool(key) {
        let data = this._data[key];
        let type = typeof data;
        if (type == "boolean") {
            return data;
        } else if (type == "number") {
            this._data[key] = data != 0;
            this._need_save = true;
            return this._data[key];
        } else if (type == "string") {
            let value = data.toLowerCase();
            if (value == "true" || value == "yes" || value == "1") {
                this._data[key] = true;
                this._need_save = true;
                return this._data[key];
            } else if (value == "false" || value == "no" || value == "0") {
                this._data[key] = false;
                this._need_save = true;
                return this._data[key];
            }
        } else {
            if (this._data.hasOwnProperty(key)) {
                delete this._data[key];
                this._need_save = true;
            }
            return undefined;
        }
    }
    _set_bool(key, value) {
        let origin = this._data[key];
        let type = typeof value;
        if (type == "boolean") {
            this._data[key] = value;
        } else if (type == "number") {
            this._data[key] = value != 0;
        } else if (type == "string") {
            let v = value.toLowerCase();
            if (v == "true" || v == "yes" || v == "1") {
                this._data[key] = true;
            } else if (v == "false" || v == "no" || v == "0") {
                this._data[key] = false;
            } else {
                throw new Error(`${value} is not a boolean value`);
            }
        } else {
            throw new Error(`${value} is not a boolean value`);
        }
        this._need_save = this._need_save || (origin != this._data[key]);
    }
    async validate() {
        this._check_data();
        if (this._need_save) await this.save();
    }
    async reload() {
        let sync = browser["storage"][this._area];
        let data = await sync["get"]();
        this._data = data;
        this._need_save = false;
        await this.validate();
    }
    async save() {
        this._is_saving = true;
        let sync = browser["storage"][this._area];
        let re = await sync["set"](this._data);
        this._is_saving = false;
        return re;
    }
    /**Remove unneeded spaces in paragraph.*/
    get strip_in_xhtml_file() {
        return this._get_bool("strip_in_xhtml_file") || false;
    }
    set strip_in_xhtml_file(value) {
        return this._set_bool("strip_in_xhtml_file", value);
    }
    /**@type {string}*/
    get version() {
        return this._data["version"];
    }
    get version_obj() {
        return new Version(this.version);
    }
}

/**
 * @returns {Promise<Settings>}
 */
async function get_settings() {
    let sync = browser["storage"]["sync"];
    let data = await sync["get"]();
    let s = new Settings(data);
    await s.validate();
    return s;
}

module.exports = { CUR_VERSION, Version, Settings, get_settings }
