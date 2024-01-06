const jsNameRgx = /\[\s*([a-zA-Z_$]?|[\w$]*)\s*\]/g;

window.$all = selector => document.querySelectorAll(selector);
window.$ = selector => document.querySelector(selector);

const HTMLPositions = {
    beforeBegin: "beforebegin",
    afterBegin: "afterbegin",
    beforeEnd: "beforeend",
    afterEnd: "afterend",
};

Element.prototype.$html = function(pos, lit) {
    this.insertAdjacentHTML(pos, lit);
}

function _template(source, ctx) {
    return source.replace(jsNameRgx, (_, cap) => {
        if (!(cap in ctx)) {
            throw Error(`template literal ${cap} was not provided in the given context`);
        }
        return ctx[cap];
    });
}

function _removeIdentifiable(element) {
    element.removeAttribute("id");
}

Element.prototype.$template = function(ctx) {
    this.outerHTML = _template(this.outerHTML, ctx);
};

Element.prototype.$retemplate = function(ctx) {
    if (this.$_templateReal) this.$_templateReal.remove();
    this.$html(HTMLPositions.afterEnd, _template(this.outerHTML, ctx));
    this.$_templateReal = this.nextElementSibling;

    _removeIdentifiable(this.$_templateReal);
    this.$_templateReal.style.display = "revert";
    this.style.display = "none";
};

Element.prototype.$templateClone = function(ctx, attrs = {}) {
    this.$html(HTMLPositions.afterEnd, _template(this.outerHTML, ctx));
    _removeIdentifiable(this.nextElementSibling);
    this.nextElementSibling.style.display = "revert";
    this.style.display = "none";

    for (const [key, value] of Object.entries(attrs)) {
        this.nextElementSibling.setAttribute(key, value);
    }
}

// TODO: look into `new Object([..])`
//       see: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/Object>
function _prim2obj(prim) {
    switch (typeof prim) {
        case "boolean": return new Boolean(prim);
        case "number": return new Number(prim);
        case "string": return new String(prim);
        case "undefined":
        case "bigint":
        case "symbol":
            return undefined;
        case "object":
        case "function":
            return null;
    }
}

// function _prim2obj(prim) { return prim; }

// var o = [..]
// var h = { set(a) { console.log("setted: ", arguments); return Reflect.set(...arguments); } }
// var p = new Proxy(o, h)

window._stateEvents = new Map();

function _hash(state) {
    const hash = [state.__path ?? "root"];
    console.log(hash, state.__path)
    let current = state;
    while (current.__parent && (current = current.__parent) !== null) {
        console.log("current:", current, ".__path", current.__path)
        hash.push(current.__path ?? "root");
    }

    return hash.reverse().join("/");
}

/*
function _eventify(obj) {
    return obj;

    const id = _hash(obj);
    console.log("eventing for ID:", id, "and object:", obj, "with path:", obj["__path"]);

    if (!window._stateEvents.has(id))
        window._stateEvents.set(id, new EventTarget());

    Object.defineProperties(obj, {
        addEventListener: {
            value: (...args) => {
                window._stateEvents.get(id).addEventListener(...args);
            },
            configurable: true, // TODO: remove & fix source
        },
        dispatchEvent: {
            value: (...args) => {
                console.log("dispatching event to:", id);
                window._stateEvents.get(id).dispatchEvent(...args);
            },
            configurable: true,
        },
    });

    return obj; // TODO: maybe don't
}

function _proxify(target, parent=null, path=null) {
    return target;

    return new Proxy(target, {
        set(obj, prop, value) {
            console.log("setting:", prop);
            console.log("dispatching on:", obj[prop].dispatchEvent);
            obj[prop].dispatchEvent(new CustomEvent("$change"));
            const stated = _prim2obj(value) ?? _createState(value, parent, path);
            return Reflect.set(obj, prop, _proxify(_eventify(stated)));
        },
        get(target, key) {
            if (!target.hasOwnProperty(key) && typeof target[key] === "function") {
                return function(...args) {
                    return target[key].call(target, args);
                }
            }
            return target[key];
        }
    });
}

function _createState(target, parent=null, path=null) {
    Object.defineProperty(target, "__parent", { value: null});
    Object.defineProperty(target, "__path", { value: null});

    for (const [key, entry] of Object.entries(target)) {
        const evented = _eventify(_prim2obj(entry) ?? _createState(entry, target, key));
        const proxy = _proxify(evented, parent, key);

        target[key] = proxy;
        Object.defineProperty(target[key], "__path", { value: key });
        Object.defineProperty(target[key], "__parent", { value: target });

    }

    // we must set this after because otherwise we will loop over them.

    return target;
}

function $createState(target) {
    return _proxify(_eventify(_createState(target)), null, null);
}
*/

    /*
function _ify(target) {


    return target;
}

function $state(target) {
    for (const [key, value] of Object.entries(target)) {
        target[key] = _ify(_prim2obj(value) ?? $state(value));
        target[key].__parent = target;
        target[key].__path = key;
    }

    return _ify(target);
}*/

function _ify(target) {
    const id = _hash(target);
    console.log(target, "->", id);
    console.log()

    if (!window._stateEvents.has(id))
        window._stateEvents.set(id, new EventTarget());

    Object.defineProperties(target, {
        msg: { value: "wow such cool" }
    });


    if (target.dbg) throw "BOLLOCKS";
    target.dbg = true;

    return target;
    // return new Proxy(target, {});
}

function _state(target) {
    for (const [key, value] of Object.entries(target)) {
        target[key] = _prim2obj(value) ?? _state(value);
        target[key].__parent = target;
        target[key].__path = key;
        target[key] = _ify(target[key]);
    }

    return target;
}

function $state(target) {
    let state = _ify(_state(target));
    state.__path = state.__parent = null;
    return state;
}

// TODO: look at using Object.setPrototypeOf(obj, EventTarget) instead of wrapping in EventTargets
//       would mean the original object & properties are intact 
//       TODO: how does this impact objects with a previously set prototype? can we merge / extend the prototypes?

// BEHAVIOUR
// - pass in any object / primitive
// - register event listeners for `$create`, `$read`, `$update` and `$delete` events
// - register events on sub-objects
// - events on sub-objects bubble up
// - re-assigning the root value need not trigger an event

function _event(target, eventName) {
    if (!target["addEventListener"]) throw Error("`$event` should only be called on objects with event support.");

    return {
        dispatch: function(event) {
            return target.dispatchEvent(event);
        },
        /** @param {function(Event): void} handler */
        set on(handler) {
            target.addEventListener(eventName, handler)
        }
    };
}

function $objEvent(obj, eventName) {
    return _event(obj, eventName);
}

const _registerEvents = cls => cls.prototype.$event = function(eventName) { return _event(this, eventName); };
//_registerEvents(Document);
//_registerEvents(Window);
//_registerEvents(HTMLElement);
_registerEvents(EventTarget);
// _registerEvents($State);

HTMLElement.prototype.$select = function(option) {
    for (child of this.children) {
        if (child.value != option)
            child.remove();
    }

    if (!this.children.length)
        throw "`option` was listed";
};

HTMLElement.prototype.$reselect = function(option) {
    let found = false;
    for (child of this.children) {
        child.style.display = child.value === option ? "block" : "none";
        found = true;
    }

    if (!found)
        throw "`option` was listed";
};

