const { get_page_params } = require('../params');

const UNKNOWN_TYPE = 0;
const QIDIAN_TYPE = 1;

/**
 * Get type info
 * @param {string} type Type name
 * @returns {number}
 */
function get_type_from_string(type) {
    if (type === 'qd' || type === 'qidian') {
        return QIDIAN_TYPE;
    }
    return UNKNOWN_TYPE;
}

class ParamsInfo {
    /**
     * @param {URLSearchParams} params
     */
    constructor(params) {
        this.__type = get_type_from_string(params.get('type') || params.get('t'));
        if (this.__type == QIDIAN_TYPE) {
            this._book_id = params.get('book_id') || params.get('bid');
            if (this._book_id !== null) {
                this._book_id = parseInt(this._book_id);
            }
        }
    }
    _type() {
        return this.__type;
    }
    /**@returns {number | null}*/
    book_id() {
        return this._book_id;
    }
}

function get_params_info() {
    let params = get_page_params();
    return new ParamsInfo(params);
}

module.exports = {
    UNKNOWN_TYPE,
    QIDIAN_TYPE,
    ParamsInfo,
    get_params_info,
}
