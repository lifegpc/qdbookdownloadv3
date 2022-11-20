class ZipStat {
    constructor() {
        /**@type {number} relative offset of local header*/
        this.offset = 0;
        /**@type {number} center directory count*/
        this.center_directory_count = 0;
        /**@type {number} center directory size*/
        this.center_directory_size = 0;
        /**@type {number} center directory offset*/
        this.offset_center_directory = 0;
    }
}

module.exports = { ZipStat };
