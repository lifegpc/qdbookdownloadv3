const { browser } = require('./const');
const { MyEvent, EventPool } = require('./eventpool');
const { connectTab, getExtensionTabs, waitTabLoaded } = require('./tabs');

let current_port = undefined;
let ep = new EventPool();

function add_port_listener() {
    current_port['onDisconnect']['addListener']((p) => {
        current_port = undefined;
        console.log(`port ${p['name']} was disconnected.`)
        let ev = new MyEvent('port-disconnect');
        ep._dispatchEvent(ev);
    })
    current_port['onMessage']['addListener']((m, p) => {
        let ev = new MyEvent('port-message');
        ev['data'] = m;
        ev['port'] = p;
        ep._dispatchEvent(ev);
    })
}

async function get_new_port(allow_create_tab = true) {
    let tabs = await getExtensionTabs();
    for (let tab of tabs) {
        if (tab['url'] && tab['discarded'] === false) {
            let url = new URL(tab['url']);
            if (url.pathname == '/manage.html' || url.pathname == '/forepage.html') {
                try {
                    let port = connectTab(tab['id'], { 'name': 'sandbox' });
                    if (port !== undefined) {
                        current_port = port;
                        add_port_listener();
                        return true;
                    }
                } catch (e) {
                    console.warn(`Failed to connect to tab ${tab['id']}:`, e);
                }
            }
        }
    }
    if (allow_create_tab) {
        let tab = await browser['tabs']['create']({ 'url': browser['runtime']['getURL']('/forepage.html'), 'active': false });
        await waitTabLoaded(tab['id']);
        try {
            let port = connectTab(tab['id'], { 'name': 'sandbox' });
            if (port !== undefined) {
                current_port = port;
                add_port_listener();
                return true;
            }
        } catch (e) {
            console.warn(`Failed to connect to tab ${tab['id']}:`, e);
        }
    }
    return false;
}

async function get_port(allow_create_tab = true) {
    if (current_port === undefined) {
        if (!await get_new_port(allow_create_tab)) {
            throw Error('No port available.')
        }
    }
    return current_port;
}

browser['runtime']['onConnect']['addListener'](p => {
    if (p['name'] != 'background') return;
    p['onMessage']['addListener']((m, port) => {
        let typ = m['@type'];
        /**@type {boolean}*/
        let allow_create_tab = m['@act'];
        if (typeof allow_create_tab != "boolean") allow_create_tab = true;
        const ALLOW_TYPES = ["eval_gdata", "qd_get_latest_chapters_key", 'qd_save_chapter'];
        if (ALLOW_TYPES.indexOf(typ) >= 0) {
            let rand = m['rand'];
            get_port(allow_create_tab).then(p => {
                /**@type {(ev: MyEvent) => void} */
                let handler = (ev) => {
                    let data = ev['data'];
                    let typ2 = data['@type'];
                    if (typ2 == typ && rand == data['rand']) {
                        ev._stop();
                        port['postMessage'](data);
                        ep._removeEventListener('port-message', handler);
                        ep._removeEventListener('port-disconnect', handler2);
                    }
                };
                let handler2 = () => {
                    console.log('port disconnected.');
                    port['postMessage'](false);
                    ep._removeEventListener('port-message', handler);
                    ep._removeEventListener('port-disconnect', handler2);
                }
                ep._addEventListener('port-message', handler);
                ep._addEventListener('port-disconnect', handler2);
                p['postMessage'](m);
            }).catch(e => {
                console.warn(e);
                port['postMessage'](false)
            })
            return
        }
        console.warn('Unknown message:', m);
        port['postMessage'](false)
    })
})
