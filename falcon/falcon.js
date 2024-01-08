const jsNameRgx = /\[\s*([a-zA-Z_$]?|[\w$]*)\s*\]/g;

window.$all = selector => document.querySelectorAll(selector);
window.$ = selector => document.querySelector(selector);
Element.$all = function(selector) { return this.querySelectorAll(selector); }
Element.$ = function(selector) { return this.querySelector(selector); }

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

// idk abt this
NodeList.prototype.$cfgClone = function(option) {
    this.forEach(node => {
        node.setAttribute("data-flntemplate", "");
        if (node.hasAttribute("data-cloned")) return;
        node.style.display = "none";

        if (((node instanceof HTMLOptionElement && node.value)
            || node.dataset.value) == option) {

            node.after(node.cloneNode(true));
            _removeIdentifiable(node.nextSibling);
            node.nextSibling.style.display = "revert";
            node.nextSibling.setAttribute("data-cloned", "");

            if (node.nextSibling.dataset.value) node.nextSibling.removeAttribute("data-value");
            if (node.nextSibling.value) node.nextSibling.removeAttribute("value");
        }
    });
};


function _event(target, eventName) {
    if (!target["addEventListener"]) throw Error("`$event` should only be called on objects with event support.");

    return {
        dispatch: function(event) {
            return target.dispatchEvent(event);
        },
        /** @param {function(Event): void} handler */
        set on(handler) {
            // if `currentScript` is `undefined`, we are executed from _within_ an event listener.
            // we will assume this means the listener is valid, and bypass checks.
            // NOTE: if someone is using `addEventListener`, we're fucked :sweat_smile:
            const defining = document.currentScript || {};
            target.addEventListener(eventName, ev => (defining.isConnected ?? true) && handler(ev));
        }
    };
}

function $objEvent(obj, eventName) {
    return _event(obj, eventName);
}

const _registerEvents = cls => cls.prototype.$event = function(eventName) { return _event(this, eventName); };
_registerEvents(EventTarget);

