# RTC

## todo

* config
- CSL/CSS
? release some of these packages?
? investigate more helpful SSR errors?
  - note: `DOMException`
  ? wrap DOM with custom errors

Reset The Counter - a composite framework with an emphasis of simplicity which emulates the vanilla web.

RTC consitutes of 4 components, each of which aim to be (mostly) independent from each other.
components may be replaced with similar tools from outside the RTC toolchain (eg. trading our CSL for `jquery`) or omitted entirely,
making the framework extremely flexible.

## components

### `smew` (HTML preprocessor)

a small preprocessor providing a layouts & includes (components, of a sort), for code re-use.

### `tern` (SSR, FS-based router)

SSR support which utilises `jsdom` to allow for DOM manipulation on the server, just as on the browser.
combined with a router operating on the filesystem, with support for slugs, arbitrary `nodejs` packages, query paramaters & custom errors.

### `skua` (CSS framework)

a minimal CSS framework providing sane defaults (opinionated to my personal style :wink: )

see:
<https://readable-css.freedomtowrite.org/> &
<https://0x5da.dev>

### `falcon` (client side library)

TBD!
a lightweight CSL to ease DOM maipulation, reduce boilerplate & prevent common pitfalls.

see:
<https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML>

