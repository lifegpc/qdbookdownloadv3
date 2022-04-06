/**
 * @param {number} x 
 * @param {number} c 
 * @returns {number}
 */
function leftrotate(x, c) {
    return (x << c) | (x >>> (32 - c));
}

/**
 * Add two numbers (32bit)
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff)
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
}

module.exports = { leftrotate, safeAdd };
