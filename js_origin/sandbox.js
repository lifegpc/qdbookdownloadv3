const compress = require('./compress');

/**
 * @param {string} fpScript 
 */
 function eval_fpScript(fpScript) {
    let datas = fpScript.split('\n');
    let re = [];
    for (let data of datas) {
        data = data.trim();
        if (data.startsWith('var el') || data.startsWith('el.')) {
            continue
        }
        re.push(data);
    }
    console.log('fpScript:', re);
    let fpData = eval(`(function(){var window={};${re.join('\n')};return window;})()`);
    if (fpData.hasOwnProperty('cContent')) {
        delete fpData['cContent'];
    }
    if (fpData.hasOwnProperty("randomFont")) {
        try {
            let a = document.createElement('text');
            a.innerHTML = fpData['randomFont'];
            fpData['randomFont'] = new Uint8Array(JSON.parse(a.innerText)['data']);
        } catch (e) {
            console.warn(e);
        }
    }
    if (fpData.hasOwnProperty("encodeCss")) {
        try {
            let a = document.createElement('text');
            a.innerHTML = fpData['encodeCss'];
            fpData['encodeCss'] = a.innerText;
        } catch (e) {
            console.warn(e);
        }
    }
    return fpData;
}

window.addEventListener('message', (ev) => {
    let source = ev.source;
    let data = ev.data;
    if (data['@type'] == 'eval_gdata') {
        let g_data = data['g_data'];
        g_data = eval("(function(){" + g_data + ";return g_data;})()");
        console.log(g_data);
        source.postMessage({ '@type': 'g_data_result', 'g_data': g_data, 'rand': data['rand'] }, '*');
    } else if (data['@type'] == 'quick_compress') {
        let bytes = data['data'];
        let re = { '@type': 'quick_compress_result', 'ok': true, 'rand': data['rand'] };
        compress.compress(bytes, data['level']).then((e) => {
            re['data'] = e;
            source.postMessage(re, '*');
        }).catch((e) => {
            re['ok'] = false;
            re['error'] = e;
            source.postMessage(re, '*');
        })
    } else if (data['@type'] == 'quick_compress2') {
        let bytes = data['data'];
        let re = { '@type': 'quick_compress2_result', 'ok': true, 'rand': data['rand'] };
        compress.compress2d(bytes, data['level']).then((e) => {
            re['data'] = e;
            source.postMessage(re, '*');
        }).catch((e) => {
            re['ok'] = false;
            re['error'] = e;
            source.postMessage(re, '*');
        })
    } else if (data['@type'] == 'quick_uncompress') {
        let bytes = data['data'];
        let re = { '@type': 'quick_uncompress_result', 'ok': true, 'rand': data['rand'] };
        compress.uncompress(bytes, data['length']).then((e) => {
            re['data'] = e;
            source.postMessage(re, '*');
        }).catch((e) => {
            re['ok'] = false;
            re['error'] = e;
            source.postMessage(re, '*');
        })
    } else if (data['@type'] == 'eval_fpScript') {
        let fpScript = data['fpScript'];
        let re = { '@type': 'fpScript_result', 'ok': true, 'rand': data['rand'] };
        try {
            re['data'] = eval_fpScript(fpScript);
        } catch (e) {
            re['ok'] = false;
            re['error'] = e;
        }
        source.postMessage(re, '*');
    }
})
