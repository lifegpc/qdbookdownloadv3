function arraybuffer_convert(data) {
    return Array.from(data);
}

const BASE_MAP = { "Uint8Array": [ Uint8Array, arraybuffer_convert, data => new Uint8Array(data) ] };

module.exports = { BASE_MAP };
