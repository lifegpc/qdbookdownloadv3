const { browser } = require('./const');
const { MyEvent, EventPool } = require('./eventpool');
const { getI18n } = require('./i18n');
const { get_session_settings, get_local_settings } = require('./settings');
const { connectTab, getExtensionTabs, waitTabLoaded, reloadTab, removeTab, getTab, highlightTab } = require('./tabs');

const MANAGE_CONTEXT_MENU_ID = 'manage_book';
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
    let session_error = r => console.warn("Failed to save session settings:", r);
    let session = (await get_session_settings()) || (await get_local_settings());
    let last_connected_sandbox = session.last_connected_sandbox;
    console.log('Last connected sandbox:', last_connected_sandbox);
    if (last_connected_sandbox !== undefined) {
        let tab = await getTab(last_connected_sandbox, true);
        if (tab !== undefined) {
            console.log('Last connected sandbox tab:', tab);
            function try_connect() {
                try {
                    console.log('Try to connect tab:', last_connected_sandbox);
                    let port = connectTab(last_connected_sandbox, { 'name': 'sandbox' });
                    if (port !== undefined) {
                        current_port = port;
                        add_port_listener();
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.warn(`Failed to connect to tab ${tab['id']}:`, e);
                    return false;
                }
            }
            if (try_connect()) {
                return true;
            }
        }
    }
    /// Chrome may return no tabs when service worker is just started but actually there are some tabs.
    let tabs = await getExtensionTabs();
    for (let tab of tabs) {
        if (tab['url']) {
            let url = new URL(tab['url']);
            let is_forepage = url.pathname == '/forepage.html';
            if (url.pathname == '/manage.html' || is_forepage) {
                if (tab['discarded'] !== false) {
                    if (is_forepage) {
                        await reloadTab(tab['id'], true);
                        await waitTabLoaded(tab['id']);
                    } else {
                        continue;
                    }
                }
                try {
                    let port = connectTab(tab['id'], { 'name': 'sandbox' });
                    if (port !== undefined) {
                        current_port = port;
                        session.last_connected_sandbox = tab['id'];
                        session._save().catch(session_error);
                        add_port_listener();
                        return true;
                    }
                } catch (e) {
                    console.warn(`Failed to connect to tab ${tab['id']}:`, e);
                    if (is_forepage) {
                        removeTab(tab['id']);
                    }
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
                session.last_connected_sandbox = tab['id'];
                session._save().catch(session_error);
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
        const ALLOW_TYPES = ["eval_gdata", "qd_get_latest_chapters_key", 'qd_save_chapter', 'qd_get_chapter'];
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

browser['runtime']['onInstalled']['addListener'](async () => {
    let menus = browser['contextMenus'];
    /**@type {void | Promise<void>} Chrome returns void, Firefox returns Promise<void>*/
    let removing = menus['removeAll']();
    if (removing instanceof Promise) {
        await removing;
    }
    await menus['create']({ 'contexts': ['action'], 'title': getI18n('manage_title'), 'id': MANAGE_CONTEXT_MENU_ID });
})

browser['contextMenus']['onClicked']['addListener'](async (info, tab) => {
    if (info['menuItemId'] == MANAGE_CONTEXT_MENU_ID) {
        let url = browser['runtime']['getURL']('/manage.html');
        let tabs = await browser['tabs']['query']({ 'url': url });
        if (tabs.length > 0) {
            let tab = tabs[0];
            await highlightTab(tab['index'], tab['windowId']);
        } else {
            await browser['tabs']['create']({ 'url': url });
        }
    }
});
