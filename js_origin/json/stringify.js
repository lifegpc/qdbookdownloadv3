const { BASE_MAP } = require('./const');

/**
 * @param {Object.<string, [()=>void, (data: any) => any, (data: any) => any | undefined, boolean | undefined, boolean | undefined]>} m
 */
function stringify2(data, m) {
    let typ = typeof data;
    if (typ == "object") {
        let keys = Object.getOwnPropertyNames(m);
        if (Array.isArray(data)) {
            let arr = [];
            for (let d of data) {
                let is_data2 = false;
                let data_type2 = undefined;
                for (let key of keys) {
                    if (d instanceof m[key][0]) {
                        is_data2 = true;
                        data_type2 = key;
                        break;
                    }
                }
                if (is_data2) {
                    let dd = m[data_type2][1](d);
                    let skip_stringify = m[data_type2][3] || false;
                    arr.push({ '@type': data_type2, 'data': skip_stringify ? dd : stringify2(dd, m) });
                } else {
                    arr.push(d);
                }
            }
            return arr;
        }
        let is_data = false;
        let data_type = undefined;
        for (let key of keys) {
            if (data instanceof m[key][0]) {
                is_data = true;
                data_type = key;
                break;
            }
        }
        if (is_data) {
            let d = m[data_type][1](data);
            let skip_stringify = m[data_type][3] || false;
            return { '@type': data_type, 'data': skip_stringify ? d : stringify2(d, m) };
        }
        let obj = {};
        let keys2 = Object.getOwnPropertyNames(data);
        for (let key of keys2) {
            obj[key] = stringify2(data[key], m);
        }
        return obj;
    }
    return data;
}

/**
 * @param {Object.<string, [()=>void, (data: any) => any, (data: any) => any | undefined, boolean | undefined, boolean | undefined]>} map
 * @param {boolean} skip_stringify if true, skip JSON.stringify
 */
function stringify(data, map = {}, skip_stringify = false) {
    let m = Object.assign({}, map, BASE_MAP);
    let d = stringify2(data, m);
    return skip_stringify ? d : JSON.stringify(d);
}

module.exports = stringify;
