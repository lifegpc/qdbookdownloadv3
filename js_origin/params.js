function get_page_params() {
    return new URL(window.location.href).searchParams;
}

/**
 * Change page params
 * @param {URLSearchParams} params
 */
function change_page_params(params) {
    history.replaceState(null, null, '?' + params.toString());
}

module.exports = {
    change_page_params,
    get_page_params,
}
