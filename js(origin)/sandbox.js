window.addEventListener('message', (ev) => {
    let source = ev.source;
    let data = ev.data;
    if (data['@type'] == 'eval_gdata') {
        let g_data = data['g_data'];
        g_data = eval("(function(){" + g_data + ";return g_data;})()");
        console.log(g_data);
        source.postMessage({'@type': 'g_data_result', 'g_data': g_data, 'rand': data['rand']}, '*');
    }
})
