# RTC

## todo

* clean up SSR as a binary
* merge SSR/FSR2
* FSR2 errors
- use the phrase "composite framework" in this doc, because it sounds badass
- oh yea come up with a name for that
- test like hell
- CSL/CSS
- HPP config
- whole project config
? release some of these packages?
? SSR errors? they suck atm (`DOMException`)

Reset The Counter - a webdev toolchain miming a framework, providing a 'vanilla web' workflow.

RTC consitutes of currently 5 components, each of which aim to be independent from each other.
components may be replaced with similar tools from outside the RTC toolchain (eg. trading RTC's CSL for `jquery`) or omitted entirely,
making the suite extremely flexible.

## components

### `rtc-hpp` HTML preprocessor

a small preprocessor providing a layouts & includes (components, of a sort), for simple code re-use.

### `rtc-ssr` SSR tooling

a micro-script to enable a primitive form of SSR.
utilises `jsdom` to allow for DOM manipulation on the server, just as on the browser.

### `rtc-css` CSS framework

a light CSS framework to provide _very_ basic sane defaults (opinionated to my personal style :wink: )

a lot of this is TBD. i might drop it alltogether.


see:
<https://readable-css.freedomtowrite.org/> &
<https://0x5da.dev>

### `rtc-fsr` file system router

(name not final :) )

a _very_ simple file-system based router with primitive slugging support.

### `rtc-csl` client side library

TBD how this will work and what it will cover, but likely a `jquery`-like API for DOM manipulation.

see:
<https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML>

