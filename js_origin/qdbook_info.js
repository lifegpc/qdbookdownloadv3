const { structuredClone } = require('./clone');

class QDBookInfo {
    constructor(basic_data) {
        this._basic_data = basic_data;
        this._id = basic_data["bookId"];
    }
    toJson() {
        return structuredClone({"basic_data": this._basic_data, "id": this._id});
    }
    static fromJson(json) {
        return new QDBookInfo(json['basic_data']);
    }
}

module.exports = { QDBookInfo };
