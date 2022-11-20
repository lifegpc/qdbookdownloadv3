const { writeUint16LE, writeUint32LE } = require('../binary');
const { MemFile } = require('../memfile');
const { CompressManager } = require('./compress');
const { ZIP_DEFLATED, END_OF_CENTRAL_DIRECTORY_SIGN } = require('./const');
const { ZipFile, ZipDirectory } = require('./local');
const { ZipStat } = require('./stat');
const { split_filename } = require('./utils');

class Zip {
    constructor(compress_manager = new CompressManager(), zip64 = false, compress_method = ZIP_DEFLATED, comment = '') {
        /**@type {CompressManager}*/
        this.compress_manager = compress_manager;
        /**@type {boolean}*/
        this.zip64 = zip64;
        /**@type {number}*/
        this.compress_method = compress_method;
        /**@type {Object.<string, ZipFile | ZipDirectory>}*/
        this._files = {};
        this.comment = comment;
    }

    /**
     * @param {ZipFile | ZipDirectory} file
     * @returns {ZipFile | ZipDirectory | undefined}
     */
    _add(file) {
        let name = file instanceof ZipFile ? file._filename : file._name;
        let names = split_filename(name);
        name = names.length ? names[0] : '';
        if (names.length > 1) {
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
        zip64 = zip64 === undefined ? this.zip64 : zip64;
        let file = new ZipDirectory(name, files, last_mod_time, comment, zip64);
        return this._add(file);
    }

    /**
     * 
     * @param {string} filename File name
     * @param {Uint8Array} data Data
     * @param {string} comment Comment
     * @param {number} compress_method Compress method
     * @param {number} compress_level Compress level
     * @param {DosTime} last_mod_time Last modified time
     * @param {boolean} zip64 Zip64 extension
     */
    add_file(filename, data, comment = '', compress_method = undefined, compress_level = undefined, last_mod_time = undefined, zip64 = undefined) {
        compress_method = compress_method === undefined ? this.compress_method : compress_method;
        zip64 = zip64 === undefined ? this.zip64 : zip64;
        let file = new ZipFile(filename, data, compress_method, compress_level, last_mod_time, comment, zip64);
        return this._add(file);
    }

    /**
     * @param {WritableStream} stream Writable Stream
     */
    async _save(stream) {
        let writer = stream.getWriter();
        await writer.ready;
        let stat = new ZipStat();
        for (let name in this._files) {
            let file = this._files[name];
            await file._write_local_header(writer, this.compress_manager, stat);
            if (file instanceof ZipFile) {
                await file._write_file_data(writer, stat);
            }
        }
        stat.offset_center_directory = stat.offset;
        for (let name in this._files) {
            let file = this._files[name];
            await file._write_central_directory_header(writer, stat);
        }
        await this._write_end_of_central_directory(writer, stat);
        await writer.ready;
        await writer.close();
    }

    /**
     * @param {BlobPropertyBag | undefined} options
     */
    async _toBlob(options = undefined, array_size = 1048576) {
        let file = new MemFile(array_size);
        await this._save(file._writer);
        return file._toBlob(options);
    }

    /**
     * @param {WritableStreamDefaultWriter} writer Writer
     * @param {ZipStat} stat
     */
    async _write_end_of_central_directory(writer, stat) {
        await writer.write(END_OF_CENTRAL_DIRECTORY_SIGN);
        await writer.write(writeUint16LE(0)); // number of this disk
        await writer.write(writeUint16LE(0)); // number of the disk with the start of the central directory
        await writer.write(writeUint16LE(stat.center_directory_count)); // total number of entries in the central directory on this disk
        await writer.write(writeUint16LE(stat.center_directory_count)); // total number of entries in the central directory
        await writer.write(writeUint32LE(stat.center_directory_size)); // size of the central directory
        await writer.write(writeUint32LE(stat.offset_center_directory)); // offset of start of central directory with respect to the starting disk number
        let encoder = new TextEncoder();
        let comment = encoder.encode(this.comment);
        await writer.write(writeUint16LE(comment.length)); // .ZIP file comment length
        await writer.write(comment); // .ZIP file comment
    }
}

module.exports = { Zip }
