/**
 * @param {string} g_data
 */
function eval_gdata(g_data) {
    /**@type {HTMLIFrameElement} */
    let sandbox = document.getElementById('sandbox');
    let rand = Math.random();
    sandbox.contentWindow.postMessage({ '@type': 'eval_gdata', 'g_data': g_data, 'rand': rand }, "*");
    return new Promise((resolve, reject) => {
        /**
         * @param {MessageEvent} ev
         */
        let listener = (ev) => {
            let data = ev.data;
            if (data['@type'] == 'g_data_result') {
                if (rand == data['rand']) {
                    window.removeEventListener('message', listener);
                    let g_data = data['g_data'];
                    resolve(g_data);
                    ev.stopImmediatePropagation();
                }
            }
        }
        window.addEventListener('message', listener);
    })
}

/**
 * @param {string} fpScript
 */
function eval_fpScript(fpScript) {
    /**@type {HTMLIFrameElement} */
    let sandbox = document.getElementById('sandbox');
    let rand = Math.random();
    sandbox.contentWindow.postMessage({ '@type': 'eval_fpScript', 'fpScript': fpScript, 'rand': rand }, "*");
    return new Promise((resolve, reject) => {
        /**
         * @param {MessageEvent} ev
         */
        let listener = (ev) => {
            let data = ev.data;
            if (data['@type'] == 'fpScript_result') {
                if (rand == data['rand']) {
                    window.removeEventListener('message', listener);
                    if (!data['ok']) {
                        reject(data['error']);
                    } else {
                        resolve(data['data']);
                    }
                    ev.stopImmediatePropagation();
                }
            }
        }
        window.addEventListener('message', listener);
    })
}

module.exports = { eval_fpScript, eval_gdata };
