const { quick_compress2 } = require('../messages');

class CompressManager {
    constructor(deflate = quick_compress2) {
        /**@type {(data: string|Uint8Array, level: number) => Promise<{data: Uint8Array, is_text: boolean | undefined, length: number}>}*/
        this.deflate = deflate;
    }
}

module.exports = { CompressManager };
