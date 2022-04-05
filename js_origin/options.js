const { browser } = require('./const');
const { get_settings } = require('./settings');
const { getI18n } = require('./i18n')
const { BoolTemplate } = require('./options/bool')

function add_title() {
    let title = document.createElement('title');
    title.innerText = getI18n('settings_page');
    document.head.append(title);
    document.getElementById('title').innerText = getI18n('settings_page');
}

async function main_handle() {
    add_title();
    let settings = await get_settings();
    /**@type {Array<BoolTemplate>}*/
    let bool_buttons = [];
    bool_buttons.push(new BoolTemplate('strip_in_xhtml_file', getI18n('strip_in_xhtml_file'), '', settings, false));
    bool_buttons.push(new BoolTemplate('add_more_info_to_xhtml', getI18n('add_more_info_to_xhtml'), '', settings, false));
    let save = document.getElementById('save');
    save.innerText = getI18n('save');
    save.addEventListener('click', () => {
        settings.save().then(() => {
            alert(getI18n('settings_saved'));
        }).catch(e => {
            console.error(e);
            alert(e);
        })
    })
    let reload = document.getElementById('reload');
    reload.innerText = getI18n('reload_settings');
    async function reload_settings() {
        await settings.reload();
        bool_buttons.forEach(b => {
            b.reload();
        })
    }
    reload.addEventListener('click', () => {
        reload_settings()
    })
    let reset = document.getElementById('reset');
    reset.innerText = getI18n('reset_settings');
    reset.addEventListener('click', () => {
        let sync = browser['storage']['sync'];
        sync['clear']().then(() => {
            reload_settings();
        });
    })
}

window.addEventListener('load', () => {
    main_handle().catch((e) => {
        console.error(e);
    })
})
