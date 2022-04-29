const { getI18n } = require('./i18n');
const { gen_main_list } = require('./manage/main_list');
const { get_params_info, QIDIAN_TYPE, UNKNOWN_TYPE } = require('./manage/params');
const qd_book_list = require('./manage/qd_book_list');
const { get_page_params, change_page_params } = require('./params');

function basic_init() {
    let title = document.createElement('title');
    title.innerText = getI18n('manage_title');
    document.head.append(title)
}

function gen_return_button(doc = document) {
    let d = doc.createElement('div');
    d.innerText = getI18n('return')
    d.addEventListener('click', () => {
        let state = window.history.state;
        let pi = get_params_info();
        let params = get_page_params();
        let type = pi._type();
        if (state != null) {}
        else if (type == QIDIAN_TYPE) {
            let bookId = pi.book_id();
            if (bookId === null) {
                params.delete('type');
                params.delete('t');
                change_page_params(params);
            } else {
                params.delete('bid');
                params.delete('book_id');
                change_page_params(params);
            }
        }
    })
    return d;
}

async function init() {
    let info = get_params_info();
    let type = info._type();
    /**@type {HTMLDivElement}*/
    let main = document.getElementById('main');
    if (type == QIDIAN_TYPE) {
        main.innerHTML = '';
        main.append(gen_return_button());
        let bookId = info.book_id();
        if (bookId === null) {
            let list = await qd_book_list.gen_book_list();
            main.append(list);
        }
    } else if (type == UNKNOWN_TYPE) {
        let list = gen_main_list();
        main.innerHTML = '';
        main.append(list);
    }
}

window.addEventListener('load', () => {
    basic_init();
    init().catch((e) => {
        console.error(e);
    });
})

window.addEventListener('replaceState', () => {
    init().catch((e) => {
        console.error(e);
    });
});
