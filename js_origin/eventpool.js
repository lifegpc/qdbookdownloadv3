/// An event
class MyEvent {
    /**
     * @param {string} type Event type
     */
    constructor(type) {
        /**@type {string} Event type*/
        this._type = type;
        /**@type {boolean} Event is stoped*/
        this._stoped = false;
    }
    /**Stop the event. */
    _stop() {
        this._stoped = true;
    }
}

class EventPool {
    constructor() {
        /**@type {Object.<string, Array<(ev: MyEvent) => void>>}*/
        this._handlerPool = {};
    }
    /**
     * Add a new event listener
     * @param {string} type Event type
     * @param {(ev: MyEvent) => void} handler Event handler
     */
    _addEventListener(type, handler) {
        if (this._handlerPool[type] === undefined) {
            this._handlerPool[type] = [];
        }
        this._handlerPool[type].push(handler);
    }
    /**
     * Dispatch an event
     * @param {MyEvent} event Event
     */
    _dispatchEvent(event) {
        if (this._handlerPool[event._type] === undefined) return;
        for (let handler of this._handlerPool[event._type]) {
            try {
                handler(event);
            } catch (e) {
                console.warn('Failed to execute handler:', e);
            }
            if (event._stoped) return;
        }
    }
    /**
     * Remove an event listener
     * @param {string} type Event type
     * @param {(ev: MyEvent) => void} handler Event handler
     */
    _removeEventListener(type, handler) {
        if (this._handlerPool[type] === undefined) return;
        let index = this._handlerPool[type].indexOf(handler);
        if (index >= 0) {
            this._handlerPool[type].splice(index, 1);
        } else {
            console.log(`Failed to find event listener for type ${type}`)
        }
    }
}

module.exports = { EventPool, MyEvent }
