function arraybuffer_convert(data) {
    return Array.from(data);
}

const BASE_MAP = { "Uint8Array": [ Uint8Array, arraybuffer_convert, undefined, true, true ] };
let skip_base_map = undefined;

function get_skip_base_map() {
    if (skip_base_map === undefined) {
        skip_base_map = {};
        let keys = Object.getOwnPropertyNames(BASE_MAP);
        for (let key of keys) {
            skip_base_map[key] = [BASE_MAP[key][0], true, undefined, true, true];
        }
    }
    return skip_base_map;
}

module.exports = { BASE_MAP, get_skip_base_map };
