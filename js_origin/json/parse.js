const { BASE_MAP } = require('./const');

function parse2(data, m) {
    let typ = typeof data;
    if (typ == "object") {
        if (Array.isArray(data)) {
            let arr = [];
            for (let d of data) {
                arr.push(parse2(d, m));
            }
            return arr;
        }
        if (data == null) {
            return data;
        }
        if (data['@type'] != undefined) {
            let type = data['@type'];
            let d = data['data'];
            return m[type][2](parse2(d, m));
        }
        let obj = {};
        let keys = Object.getOwnPropertyNames(data);
        for (let key of keys) {
            obj[key] = parse2(data[key], m);
        }
        return obj;
    }
    return data;
}

/**
 * @param {string} data
 **/
function parse(data, map = {}) {
    let m = Object.assign({}, map, BASE_MAP);
    return parse2(JSON.parse(data), m);
}

module.exports = parse;
