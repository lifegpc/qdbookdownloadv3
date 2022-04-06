const { Settings } = require('../settings')

class BoolTemplate {
    /**
     * @param {string} name name of settings
     * @param {string} title title of settings
     * @param {string} description description of settings
     * @param {Settings} settings settings
     * @param {(s: Settings) => boolean | boolean} get default value of settings or function to get value of settings, if undefined, default value is false
     * @param {(s: Settings, b: boolean) => void} set settings
     * @param {HTMLTableElement} table table to add row
     */
    constructor(name, title, description, settings, get = undefined, set = undefined, table = document.getElementById('main_settings')) {
        this._name = name;
        this._title = title;
        this._description = description;
        this._settings = settings;
        this._get = get;
        this._set = set;
        this._table = table;
        this._div = undefined;
        this._select = undefined;
        this._create_element();
    }
    _create_element() {
        let doc = this._table.ownerDocument;
        /**@type {HTMLTemplateElement}*/
        let temp = doc.getElementById('bool-template');
        /**@type {HTMLDivElement} */
        this._div = temp.content.cloneNode(true);
        let title = doc.createElement('b');
        title.innerText = this._title.length ? this._title : this._name;
        let div = this._div.querySelector('td.a');
        div.append(title);
        if (this._description.length) {
            div.append(document.createElement('br'));
            div.append(this.description);
        }
        this._select = this._div.querySelector('select');
        this._select.addEventListener('change', () => {
            this._set_value(this._select.value == 'true');
        })
        this._select.value = this._get_value() ? 'true' : 'false';
        this._table.tBodies[0].append(this._div);
    }
    _get_value() {
        if (typeof this._get == "boolean") {
            return this._settings._get_bool(this._name) || this._get;
        } else if (typeof this._get == "function") {
            return this._get(this._settings);
        } else {
            return this._settings._get_bool(this._name) || false;
        }
    }
    _set_value(value) {
        if (typeof this._set == "function") {
            this._set(this._settings, value);
        } else {
            this._settings._set_bool(this._name, value);
        }
    }
    _reload() {
        this._select.value = this._get_value() ? 'true' : 'false';
    }
}

module.exports = { BoolTemplate }
