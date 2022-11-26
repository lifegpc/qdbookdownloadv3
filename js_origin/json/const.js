function arraybuffer_convert(data) {
    return Array.from(data);
}

const BASE_MAP = { "Uint8Array": [ Uint8Array, arraybuffer_convert, undefined, true, true ] };

module.exports = { BASE_MAP };
