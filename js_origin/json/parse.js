const { BASE_MAP } = require('./const');

/**
 * @param {Object.<string, [()=>void, (data: any) => any, (data: any) => any | undefined, boolean | undefined, boolean | undefined]>} m
 */
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
            if (m[type] === undefined) {
                return data;
            }
            let d = data['data'];
            let p = m[type][2] || ((data) => new m[type][0](data));
            let skip_parse = m[type][4] || false;
            return p(skip_parse ? d : parse2(d, m));
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
 * @param {Object.<string, [()=>void, (data: any) => any, (data: any) => any | undefined, boolean | undefined, boolean | undefined]>} map
 * @param {boolean} skip_parse if true, skip JSON.parse
 **/
function parse(data, map = {}, skip_parse = false) {
    let m = Object.assign({}, map, BASE_MAP);
    return parse2(skip_parse ? data : JSON.parse(data), m);
}

module.exports = parse;
