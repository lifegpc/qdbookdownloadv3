const parse = require('./json/parse');
const stringify = require('./json/stringify');

function structuredClone(value, transfer) {
    if (globalThis["structuredClone"]) {
        return globalThis["structuredClone"](value, transfer);
    } else {
        return parse(stringify(value));
    }
}

module.exports = { structuredClone };
