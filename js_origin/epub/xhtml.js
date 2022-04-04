const { Settings } = require('../settings')

class XHtml {
    /**
     * @param {Settings} settings Settings
     * @param {string} href Location of xhtml file
     */
    constructor(settings, href) {
        this._href = href;
        this._settings = settings;
        /**@type {Document}*/
        this.doc = new DOMParser().parseFromString('<?xml version=\'1.0\' encoding=\'utf-8\'?><html xmlns="http://www.w3.org/1999/xhtml"><head/><body/></html>', 'application/xhtml+xml');
    }
    _strip() {
        let ps = this.doc.getElementsByTagName('p');
        for (let i = 0; i < ps.length; i++) {
            let p = ps[i];
            p.innerHTML = p.innerHTML.trim();
        }
    }
    to_blob() {
        let xhtml = this.to_xhtml();
        let blob = new Blob([xhtml], { type: 'application/xhtml+xml' });
        return blob;
    }
    to_xhtml() {
        if (this._settings.strip_in_xhtml_file) {
            this._strip();
        }
        return new XMLSerializer().serializeToString(this.doc);
    }
}

module.exports = { XHtml };
