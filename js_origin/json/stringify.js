const { BASE_MAP } = require('./const');

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
                    arr.push({ '@type': data_type2, 'data': stringify2(m[data_type2][1](d), m) });
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
            return { '@type': data_type, 'data': stringify2(m[data_type][1](data), m) };
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

function stringify(data, map = {}) {
    let m = Object.assign({}, map, BASE_MAP);
    return JSON.stringify(stringify2(data, m));
}

module.exports = stringify;
