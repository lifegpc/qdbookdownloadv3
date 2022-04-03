function structuredClone(value, transfer) {
    if (globalThis["structuredClone"]) {
        return globalThis["structuredClone"](value, transfer);
    } else {
        return JSON.parse(JSON.stringify(value));
    }
}

module.exports = { structuredClone };
