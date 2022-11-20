const { LOCAL_FILE_HEADER_SIGN, ZIP_DEFLATED, ZIP_FLAG_UTF8, ZIP_STORED, CENTRAL_FILE_HEADER_SIGN, VERSION_MADE_BY } = require('./const');
const { DosTime } = require('./time');
const { writeUint16LE, writeUint32LE } = require('../binary');
const { CompressManager } = require('./compress');
const crc32 = require('../hash/crc32');
const { ZipStat } = require('./stat');
const { split_filename } = require('./utils');

class ZipFile {
    /**
     * 
     * @param {string} filename File name
     * @param {Uint8Array} data Data
     * @param {number} compress_method Compress method
     * @param {number} compress_level Compress level
     * @param {DosTime} last_mod_time Last modified time
     * @param {string} comment Comment
     * @param {boolean} zip64 Zip64 extension
     */
    constructor(filename, data, compress_method, compress_level, last_mod_time = new DosTime(), comment = '', zip64 = false) {
        /**@type {string}*/
        this._filename = split_filename(filename).join('/');
        /**@type {Uint8Array}*/
        this._data = data;
        /**@type {number}*/
        this._compress_method = compress_method;
        /**@type {number}*/
        this._compress_level = compress_level;
        /**@type {DosTime}*/
        this._last_mod_time = last_mod_time;
        /**@type {string}*/
        this._comment = comment;
        /**@type {boolean}*/
        this._zip64 = zip64;
        /**@type {Uint8Array | undefined}*/
        this._compressed_data = undefined;
        /**@type {number | undefined}*/
        this._crc32 = undefined;
        /**@type {number | undefined} relative offset of local header*/
        this._offset = undefined;
        /**@type {boolean}*/
        this._is_text = false;
    }

    get _flag() {
        return ZIP_FLAG_UTF8;
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {CompressManager} compress_manager Compress manager
     * @param {ZipStat} stat
    */
    async _write_local_header(writer, compress_manager, stat) {
        this._offset = stat.offset;
        await writer.write(LOCAL_FILE_HEADER_SIGN);
        await writer.write(writeUint16LE(this.version_needed_to_extract));
        await writer.write(writeUint16LE(this._flag));
        await writer.write(writeUint16LE(this._compress_method));
        await writer.write(writeUint16LE(this._last_mod_time._time()));
        await writer.write(writeUint16LE(this._last_mod_time._date()));
        this._crc32 = crc32(this._data);
        if (this._compress_method == ZIP_STORED) {
            await writer.write(writeUint32LE(this._crc32));
            await writer.write(writeUint32LE(this._data.length));
            await writer.write(writeUint32LE(this._data.length));
        } else if (this._compress_method == ZIP_DEFLATED) {
            let re = await compress_manager.deflate(this._data, this._compress_level);
            this._compressed_data = re['data'];
            let is_text = re['is_text'];
            if (is_text !== undefined) {
                this._is_text = is_text;
            }
            await writer.write(writeUint32LE(this._crc32));
            await writer.write(writeUint32LE(this._compressed_data.length));
            await writer.write(writeUint32LE(this._data.length));
        } else {
            throw new Error('Unknown compress method.');
        }
        let encoder = new TextEncoder();
        let filename = encoder.encode(this._filename);
        await writer.write(writeUint16LE(filename.length));
        await writer.write(writeUint16LE(0));
        await writer.write(filename);
        stat.offset += 30 + filename.length;
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {ZipStat} stat
     */
    async _write_file_data(writer, stat) {
        let data = this._compressed_data || this._data;
        await writer.write(data);
        stat.offset += data.length;
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {ZipStat} stat
     */
    async _write_central_directory_header(writer, stat) {
        await writer.write(CENTRAL_FILE_HEADER_SIGN);
        await writer.write(VERSION_MADE_BY);
        await writer.write(writeUint16LE(this.version_needed_to_extract));
        await writer.write(writeUint16LE(this._flag));
        await writer.write(writeUint16LE(this._compress_method));
        await writer.write(writeUint16LE(this._last_mod_time._time()));
        await writer.write(writeUint16LE(this._last_mod_time._date()));
        await writer.write(writeUint32LE(this._crc32));
        await writer.write(writeUint32LE(this._compressed_data ? this._compressed_data.length : this._data.length));
        await writer.write(writeUint32LE(this._data.length));
        let encoder = new TextEncoder();
        let filename = encoder.encode(this._filename);
        let comment = encoder.encode(this._comment);
        await writer.write(writeUint16LE(filename.length));
        await writer.write(writeUint16LE(0)); // extra field length
        await writer.write(writeUint16LE(comment.length));
        await writer.write(writeUint16LE(0)); // disk number start
        await writer.write(writeUint16LE(this._is_text ? 1 : 0)); // internal file attributes
        await writer.write(writeUint32LE(0)); // external file attributes
        if (this._offset === undefined) {
            throw new Error('Please call _write_local_header first.');
        }
        await writer.write(writeUint32LE(this._offset));
        await writer.write(filename);
        await writer.write(comment);
        stat.offset += 46 + filename.length + comment.length;
        stat.center_directory_size += 46 + filename.length + comment.length;
        stat.center_directory_count += 1;
    }

    get version_needed_to_extract() {
        return this._zip64 ? 45 : this._compress_method == ZIP_DEFLATED ? 20 : 10;
    }
}

class ZipDirectory {
    /**
     * 
     * @param {string} name Directory name
     * @param {Object.<string, ZipFile | ZipDirectory>} files Files
     * @param {DosTime} last_mod_time Last modified time
     * @param {string} comment Comment
     * @param {boolean} zip64 Zip64 extension
     */
    constructor(name, files = {}, last_mod_time = new DosTime(), comment = '', zip64 = false) {
        /**@type {string}*/
        this._name = split_filename(name).join('/') + '/';
        /**@type {Object.<string, ZipFile | ZipDirectory>}*/
        this._files = files;
        /**@type {DosTime}*/
        this._last_mod_time = last_mod_time;
        /**@type {string}*/
        this._comment = comment;
        /**@type {boolean}*/
        this._zip64 = zip64;
        /**@type {number | undefined} relative offset of local header*/
        this._offset = undefined;
        /**@type {Array<string> | undefined}*/
        this._splited_names = undefined;
    }

    /**
     * @param {ZipDirectory | ZipFile} file
     * @returns {ZipDirectory | ZipFile | undefined}
     */
    _add(file) {
        let name = file instanceof ZipFile ? file._filename : file._name;
        let names = split_filename(name);
        if (names.length <= this.splited_names.length) {
            throw Error(`File ${name} can not be added to this directory ${this._name}.`);
        }
        for (let i = 0; i < this.splited_names.length; i++) {
            if (this.splited_names[i] != names[i]) {
                throw Error(`File ${name} can not be added to this directory ${this._name}.`);
            }
        }
        name = names[this.splited_names.length];
        if (names.length > this.splited_names.length + 1) {
            let dir_name = name + '/';
            if (!(dir_name in this._files)) {
                this.add_directory(dir_name);
            }
            let dir = this._files[dir_name];
            if (dir instanceof ZipDirectory) {
                return dir._add(file);
            } else {
                throw new Error(`${dir_name} is not a directory`);
            }
        } else {
            if (file instanceof ZipDirectory) name += '/';
            if (name in this._files) {
                let old = this._files[name];
                this._files[name] = file;
                return old;
            } else {
                this._files[name] = file;
                return undefined;
            }
        }
    }

    /**
     * 
     * @param {string} name Directory name
     * @param {Object.<string, ZipFile | ZipDirectory>} files Files
     * @param {string} comment Comment
     * @param {DosTime} last_mod_time Last modified time
     * @param {boolean} zip64 Zip64 extension
     */
    add_directory(name, files = {}, comment = '', last_mod_time = undefined, zip64 = undefined) {
        zip64 = zip64 === undefined ? this._zip64 : zip64;
        let file = new ZipDirectory(this._name + name, files, last_mod_time, comment, zip64);
        return this._add(file);
    }

    get _flag() {
        return ZIP_FLAG_UTF8;
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {CompressManager} compress_manager Compress manager
     * @param {ZipStat} stat
    */
    async _write_local_header(writer, compress_manager, stat) {
        this._offset = stat.offset;
        await writer.write(LOCAL_FILE_HEADER_SIGN);
        await writer.write(writeUint16LE(this.version_needed_to_extract));
        await writer.write(writeUint16LE(this._flag));
        await writer.write(writeUint16LE(ZIP_STORED));
        await writer.write(writeUint16LE(this._last_mod_time._time()));
        await writer.write(writeUint16LE(this._last_mod_time._date()));
        await writer.write(writeUint32LE(0));
        await writer.write(writeUint32LE(0));
        await writer.write(writeUint32LE(0));
        let encoder = new TextEncoder();
        let filename = encoder.encode(this._name);
        await writer.write(writeUint16LE(filename.length));
        await writer.write(writeUint16LE(0));
        await writer.write(filename);
        stat.offset += 30 + filename.length;
        for (let name in this._files) {
            let file = this._files[name];
            await file._write_local_header(writer, compress_manager, stat);
            if (file instanceof ZipFile) {
                await file._write_file_data(writer, stat);
            }
        }
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {ZipStat} stat
     */
    async _write_central_directory_header(writer, stat) {
        await writer.write(CENTRAL_FILE_HEADER_SIGN);
        await writer.write(VERSION_MADE_BY);
        await writer.write(writeUint16LE(this.version_needed_to_extract));
        await writer.write(writeUint16LE(this._flag));
        await writer.write(writeUint16LE(ZIP_STORED));
        await writer.write(writeUint16LE(this._last_mod_time._time()));
        await writer.write(writeUint16LE(this._last_mod_time._date()));
        await writer.write(writeUint32LE(0));
        await writer.write(writeUint32LE(0));
        await writer.write(writeUint32LE(0));
        let encoder = new TextEncoder();
        let filename = encoder.encode(this._name);
        let comment = encoder.encode(this._comment);
        await writer.write(writeUint16LE(filename.length));
        await writer.write(writeUint16LE(0)); // extra field length
        await writer.write(writeUint16LE(comment.length));
        await writer.write(writeUint16LE(0)); // disk number start
        await writer.write(writeUint16LE(0)); // internal file attributes 
        await writer.write(writeUint32LE(0)); // external file attributes
        if (this._offset === undefined) {
            throw new Error('Please call _write_local_header first.');
        }
        await writer.write(writeUint32LE(this._offset));
        await writer.write(filename);
        await writer.write(comment);
        stat.offset += 46 + filename.length + comment.length;
        stat.center_directory_size += 46 + filename.length + comment.length;
        stat.center_directory_count += 1;
        for (let name in this._files) {
            let file = this._files[name];
            await file._write_central_directory_header(writer, stat);
        }
    }

    get version_needed_to_extract() {
        return this._zip64 ? 45 : 20;
    }

    get splited_names() {
        if (this._splited_names === undefined) {
            this._splited_names = split_filename(this._name);
        }
        return this._splited_names;
    }
}

module.exports = { ZipFile, ZipDirectory }
