/**
 * @param {Blob} blob Blob
 * @param {string} filename File name
 */
function saveBlob(blob, fileName, doc = document) {
    let a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    doc.body.append(a);
    a.click();
    doc.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

module.exports = { saveBlob };
