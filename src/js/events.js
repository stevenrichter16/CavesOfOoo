// src/core/events.js
// Tiny, module-scoped pub/sub. ESM caching makes this a shared singleton.

const bus = new Map(); // Map<eventType, Array<handler>>

/**
 * Subscribe to an event type. Returns an unsubscribe function.
 * @param {string} type
 * @param {(payload:any)=>void} handler
 * @returns {()=>void}
 */
export function on(type, handler) {
    try {
        let arr = bus.get(type);
        if (!arr) { arr = []; bus.set(type, arr); }
        arr.push(handler);
        console.log("in ON arr:", arr);
    } catch (e) {
        console.log("Exception in ON:", e);
    }
    return () => off(type, handler);
}

/**
 * Unsubscribe a handler from an event type.
 * @param {string} type
 * @param {(payload:any)=>void} handler
 */
export function off(type, handler) {
    const arr = bus.get(type);
    if (!arr) return;
    const i = arr.indexOf(handler);
    if (i >= 0) arr.splice(i, 1);
}

/**
 * Emit an event to all subscribers.
 * @param {string} type
 * @param {any} payload
 */
export function emit(type, payload) {
    console.log("in emit", payload)
    const arr = bus.get(type);
    if (!arr || arr.length === 0) return;
    // copy to allow off() within a handler without skipping others
    for (const fn of [...arr]) {
        console.log("in for loop")
        try { fn(payload); }
        catch (e) { console.error(`[events] "${type}" handler error:`, e); }
    }
}

/**
 * Emit a pre-event that listeners may cancel by setting payload.cancel = true.
 * Returns true if cancelled.
 * @param {string} type
 * @param {Record<string,any>} payload
 * @returns {boolean}
 */
export function emitCancellable(type, payload = {}) {
    payload.cancel = false;
    emit(type, payload);
    return !!payload.cancel;
}