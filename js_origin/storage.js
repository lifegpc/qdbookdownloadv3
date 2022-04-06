/**@type {StorageManager} */
let storage = navigator.storage || globalThis['WorkerNavigator']['storage'];

async function make_storage_persist() {
    let persisted = await storage.persisted();
    if (!persisted) {
        persisted = await storage.persist();
    }
    return persisted;
}

module.exports = { make_storage_persist };
