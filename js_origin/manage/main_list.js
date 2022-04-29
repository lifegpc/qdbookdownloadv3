const { getI18n } = require("../i18n");
const { get_page_params, change_page_params } = require('../params');

/** Generate Book Type List
 * @param {Document} doc Document
 * @returns {Element} Book Type List
 */
function gen_main_list(doc = document) {
    let div = doc.createElement('div');
    div.classList.add('main-list');
    div.append(getI18n('click_manage_website'));
    let ul = doc.createElement('ul');
    div.append(ul);
    /**
     * add item to list
     * @param {string} website_key The i18n key of website name
     * @param {string} type_key The type name
     * @param {Array<string>} param_keys The param keys deleted from url
     */
    function add_item(website_key, type_key, param_keys) {
        let li = doc.createElement('li');
        let label = doc.createElement('label');
        label.innerText = getI18n(website_key);
        label.addEventListener('click', () => {
            let params = get_page_params();
            params.delete('type');
            params.delete('t');
            params.set('t', type_key);
            if (param_keys && param_keys.length) {
                for (let key of param_keys) {
                    params.delete(key);
                }
            }
            change_page_params(params);
        });
        li.append(label);
        ul.append(li);
    }
    add_item('qidian', 'qd', ['book_id', 'bid']);
    return div;
}

module.exports = { gen_main_list };
