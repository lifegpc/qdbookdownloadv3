const ZIP_STORED = 0;
const ZIP_DEFLATED = 8;
const VERSION_MADE_BY = new Uint8Array([63, 0]);
const ZIP_FLAG_UTF8 = 1 << 11;
const LOCAL_FILE_HEADER_SIGN = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const CENTRAL_FILE_HEADER_SIGN = new Uint8Array([0x50, 0x4b, 0x01, 0x02]);
const END_OF_CENTRAL_DIRECTORY_SIGN = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);

module.exports = {
    ZIP_DEFLATED,
    ZIP_STORED,
    VERSION_MADE_BY,
    ZIP_FLAG_UTF8,
    LOCAL_FILE_HEADER_SIGN,
    CENTRAL_FILE_HEADER_SIGN,
    END_OF_CENTRAL_DIRECTORY_SIGN,
}
