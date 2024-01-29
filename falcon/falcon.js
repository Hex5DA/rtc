window.$all = selector => document.querySelectorAll(selector);
window.$ = selector => document.querySelector(selector);
Element.$all = function(selector) { return this.querySelectorAll(selector); }
Element.$ = function(selector) { return this.querySelector(selector); }

Element.prototype.$html = function(pos, lit) {
    this.insertAdjacentHTML(pos, lit);
}

const jsNameRgx = /\[\s*([a-zA-Z_$]?|[\w$]*)\s*\]/g;
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
    this.$html("afterend", _template(this.outerHTML, ctx));
    this.$_templateReal = this.nextElementSibling;

    _removeIdentifiable(this.$_templateReal);
    this.$_templateReal.style.display = "revert";
    this.style.display = "none";
};

Element.prototype.$templateClone = function(ctx, attrs = {}) {
    this.$html("afterend", _template(this.outerHTML, ctx));
    _removeIdentifiable(this.nextElementSibling);
    this.nextElementSibling.style.display = "revert";
    this.style.display = "none";

    for (const [key, value] of Object.entries(attrs)) {
        this.nextElementSibling.setAttribute(key, value);
    }
}

// would this make more sense as $select?
NodeList.prototype.$cfg = function(option) {
    this.forEach(node => {
        if (((node instanceof HTMLOptionElement && node.value) || node.dataset.value) != option)
            node.remove();
    });
};

NodeList.prototype.$recfg = function(option) {
    this.forEach(node => {
        node.style.display = (((node instanceof HTMLOptionElement && node.value)
            || node.dataset.value) != option) ? "revert" : "none";
    });
};

NodeList.prototype.$cfgClone = function(option) {
    const firstIter = Array.from(this).every(el => !el.hasAttribute("data-flntemplate"));
    if (firstIter) this.forEach(node => {
        node.setAttribute("data-flntemplate", "");
        node.style.display = "none";
    });

    this.forEach(node => {
        if (!node.hasAttribute("data-flntemplate")) return;
        if (((node instanceof HTMLOptionElement && node.value)
            || node.dataset.value) == option) {

            node.after(node.cloneNode(true));
            _removeIdentifiable(node.nextSibling);
            node.nextSibling.removeAttribute("data-flntemplate");
            node.nextSibling.style.display = "revert";

            if (node.nextSibling.dataset.value) node.nextSibling.removeAttribute("data-value");
            if (node.nextSibling.value) node.nextSibling.removeAttribute("value");
        }
    });
};


function $objEvent(target, ...eventNames) {
    if (!target["addEventListener"]) throw Error("event functions should only be called on objects with event support.");
    if (!target["dispatchEvent"]) throw Error("event functions should only be called on objects with event support.");

    return {
        dispatch: function() {
            const prospects = eventNames.map(eventName => target.dispatchEvent(eventName));
            return prospects === 1 ? prospects[0] : prospects;
        },
        /** @param {function(Event): void} handler */
        set on(handler) {
            // if `currentScript` is `undefined`, we are executed from _within_ an event listener.
            // we will assume this means the listener is valid, and bypass checks.
            // NOTE: if someone is using `addEventListener`, we're fucked :sweat_smile:
            const defining = document.currentScript || {};
            // console.log(defining);
            eventNames.forEach(eventName =>
                target.addEventListener(eventName, ev => (defining.isConnected ?? true) && handler(ev)));
        }
    };
}

EventTarget.prototype.$event = function (...eventNames) {
    return $objEvent(this, ...eventNames);
};

