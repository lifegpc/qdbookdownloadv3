/**
 * @param {string} s File name
 */
function split_filename(s) {
    let tmp = s.split('/');
    let n = [];
    for (let i of tmp) {
        if (!i.length || i == '.') {
            continue;
        }
        if (i == '..') {
            n.pop();
            continue;
        }
        n.push(i);
    }
    return n;
}

module.exports = { split_filename };
