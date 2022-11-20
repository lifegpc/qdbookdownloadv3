class MemFile {
    constructor(array_size = 1048576) {
        /**@type {number} Data length*/
        this._length = 0;
        /**@type {Array<Uint8Array>} Data array*/
        this._data = [];
        this._array_size = array_size;
        this._closed = false;
        this._writer = new WritableStream({
            'start': (controller) => { },
            'abort': (reason) => {
                this._data = [];
                this._length = 0;
                this._closed = true;
            },
            'close': (controller) => {
                this._closed = true;
            },
            'write': (chunk, controller) => {
                return this._write(chunk, controller);
            }
        })
    }

    /**
     * @param {Uint8Array} chunk Chunk
     * @param {WritableStreamDefaultController} controller Controller
     */
    async _write(chunk, controller) {
        let len = chunk.length;
        let endpos = this._length + len;
        while (endpos > this._data.length * this._array_size) {
            this._data.push(new Uint8Array(this._array_size));
        }
        let start = Math.floor(this._length / this._array_size);
        let end = Math.floor(endpos / this._array_size);
        let offset = 0;
        for (let i = start; i <= end; i++) {
            let stpos = Math.max(this._length, i * this._array_size) - i * this._array_size;
            let edpos = Math.min(endpos, (i + 1) * this._array_size) - i * this._array_size;
            let stlen = edpos - stpos;
            this._data[i].set(chunk.subarray(offset, offset + stlen), stpos);
            offset += stlen;
        }
        this._length = endpos;
    }

    /**
     * @param {BlobPropertyBag | undefined} options
     */
    _toBlob(options = undefined) {
        let blob = new Blob(this._data, options);
        return this._length === this._array_size * this._data.length ? blob : blob.slice(0, this._length, blob.type);
    }
}

module.exports = { MemFile };
