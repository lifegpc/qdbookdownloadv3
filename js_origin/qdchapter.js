const { browser } = require('./const');
const { QDChapterInfo } = require('./qdchapter_info');

function get_g_data() {
    let cols = document.getElementsByTagName('script');
    for (let i = 0; i < cols.length; i++) {
        let c = cols[i];
        if (c.innerText.indexOf('g_data') >= 0) {
            return c.innerText;
        }
    }
}

browser['runtime']['onMessage']['addListener']((request, sender, sendResponse) => {
    if (request['@type'] == 'get_qdchapter_gdata') {
        let re = {"@type": "qd_chapter_gdata", "ok": true, 'msg': 'ok'}
        if (document.getElementsByClassName('error-text fl').length) {
            re['ok'] = false;
            re['msg'] = '404或其他错误'
        } else {
            let g_data = get_g_data();
            if (!g_data) {
                re['ok'] = false;
                re['msg'] = '找不到数据';
            } else {
                re['g_data'] = g_data;
            }
        }
        sendResponse(re)
        return true;
    } else if (request['@type'] == 'get_qdchapter') {
        let data = {"name": "", "contents": [], "words": 0, "uploadTime": ""};
        let re = {"@type": "qdchapter", "code": 0, data: data};
        let ci = new QDChapterInfo(request['g_data']);
        if (document.getElementsByClassName('error-text fl').length) {
            re['code'] |= 1;
        } else {
            let ocols = document.getElementsByClassName('content-wrap');
            /**@type {Array<HTMLElement>} */
            let cols = [];
            for (let i = 0; i < ocols.length; i++) {
                let p = ocols[i].parentElement;
                if (p.getAttribute("data-type") == "2") {
                    cols.push(ocols[i]);
                }
            }
            if (cols.length) {
                data['name'] = cols[0].innerHTML;
            } else {
                re['code'] |= 2;
            }
            let max = ci.vipStatus() == 1 && ci.isBuy() == 0 ? cols.length : cols.length - 1;
            if (ci.vipStatus() == 1 && ci.isBuy() == 0) {
                // TODO: Add buy status
            }
            if (max == 0) {
                re['code'] |= 2;
                sendResponse(re);
                return true;
            }
            for (let i = 1; i < max; i++) {
                let c = cols[i];
                data['contents'].push(c.innerText);
            }
            cols = document.getElementsByClassName('j_chapterWordCut');
            if (cols.length) {
                try {
                    data['words'] = parseInt(cols[0].innerHTML);
                } catch (e) {
                    re['code'] |= 4;
                }
            } else {
                re['code'] |= 4;
            }
            cols = document.getElementsByClassName('j_updateTime');
            if (cols.length) {
                data['uploadTime'] = cols[0].innerHTML;
            } else {
                re['code'] |= 8;
            }
        }
        sendResponse(re);
        return true;
    }
    return false;
})
