class DosTime {
    constructor(time) {
        if (time === undefined) {
            /**@type {Date}*/
            this.odate = new Date();
        } else if (time instanceof Date) {
            this.odate = time;
        } else if (typeof time == "string" || typeof time == "number") {
            this.odate = new Date(time);
        } else {
            throw Error(`Invalid time: ${time}`);
        }
        this.cached_date = undefined;
        this.cached_time = undefined;
    }

    _date() {
        if (this.cached_date === undefined) {
            let year = this.odate.getUTCFullYear();
            let month = this.odate.getUTCMonth() + 1;
            let day = this.odate.getUTCDay();
            this.cached_date = (year - 1980) << 9 | month << 5 | day;
        }
        return this.cached_date;
    }

    _time() {
        if (this.cached_time === undefined) {
            let hour = this.odate.getUTCHours();
            let minute = this.odate.getUTCMinutes();
            let second = this.odate.getUTCSeconds();
            this.cached_time = hour << 11 | minute << 5 | second >> 1;
        }
        return this.cached_time;
    }
}

module.exports = { DosTime };
