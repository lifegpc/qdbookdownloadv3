/**
 * @param {string} g_data
 */
function eval_gdata(g_data) {
    /**@type {HTMLIFrameElement} */
    let sandbox = document.getElementById('sandbox');
    let rand = Math.random();
    sandbox.contentWindow.postMessage({'@type': 'eval_gdata', 'g_data': g_data, 'rand': rand}, "*");
    return new Promise((resolve, reject) => {
        let listener = (ev) => {
            let data = ev.data;
            if (data['@type'] == 'g_data_result') {
                window.removeEventListener('message', listener);
                let g_data = data['g_data'];
                if (rand == data['rand']) {
                    resolve(g_data);
                }
            }
        }
        window.addEventListener('message', listener);
    })
}

module.exports = { eval_gdata };
