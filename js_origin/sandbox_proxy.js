const { eval_gdata } = require('./eval');

function connect_handler(port) {
    if (port['name'] != 'sandbox') return;
    port['onMessage']['addListener']((m, p) => {
        let typ = m['@type'];
        if (typ == "eval_gdata") {
            eval_gdata(m['g_data']).then(data => {
                p['postMessage']({ '@type': 'eval_gdata', 'g_data': data, 'rand': m['rand'] });
            }).catch(e => {
                console.warn("Failed to eval gdata string:", e);
                p['postMessage'](false);
            })
            return;
        }
    })
}

module.exports = connect_handler;
