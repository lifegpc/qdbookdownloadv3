const { getI18n } = require('./i18n');
const { get_params_info, QIDIAN_TYPE } = require('./manage/params');
const qd_book_list = require('./manage/qd_book_list');

function basic_init() {
    let title = document.createElement('title');
    title.innerText = getI18n('manage_title');
    document.head.append(title)
}

async function init() {
    let info = get_params_info();
    if (info._type() == QIDIAN_TYPE) {
        let bookId = info.book_id();
        if (bookId === null) {
            console.log(await qd_book_list.get_all_books_id());
        }
    }
}

window.addEventListener('load', () => {
    basic_init();
    init().catch((e) => {
        console.error(e);
    });
})
