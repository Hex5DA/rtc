# Reset The Counter

bear with me, i'm rethinking the project architecture

a micro-framework / HTML preprocessor i'm considering developing.

## scratchpad 

- include a file with `<!--- @include <url> -->` (note the starting 3 `-`s!)
- this HTML file doesn't need `html`, `body` or `head` tags. `style` and `script` can be top level
  (note: this means `style` and `script` tags will be present in the main file's `body` :/)
- todo: research import maps?
- layouts, eg.
  `page.html`
  ```html
  <!--- @include ./header.html -->
  <p>this text is visible on every page using the layout!</p>
  <!--- @slot -->
  <!--- @include ./footer.html -->
  ```
  `index.html`
  ```
  <!--- @using ./page.rtcl -->
  <p>this is inserted into the slot part :)</p>
  ```
- all pages must have a layout - however may be simple. eg.
  `layouts/default.html`
  ```html
  <!DOCTYPE html />
  <html>
    <head>
        <link href="styles/global.css" rel="stylesheet" />
        <title>demo RTC website</title>
    </head>
    <body>
        <!--- @slot -->
    </body>
  </html>
  ```
  `pages/index.html`
  ```html
  <!--- @using default.html -->
  <h1>the index page!</h1>
  <p>this will be substituted into the `@slot` element above.</p>
  ```

## ~~SSR~~

this won't work.

- advanced routing (with slugs?)
- caching server side JS? (API similar to `setTimeout`)
- consider doing SSR via HTML attributes (an [alpine](https://alpinejs.dev)-like approach)

## tooling

- command: `build`
  find every page
  resolve framework features:
    - resolve `@includes`
    - resolve `@using` (layouts)
    - spit the static `html` files out into `dist/`
      - follow the directory hierarchy
        `pages/index.html` -> `dist/index.html`
        `pages/url/index.html` -> dist/url/index.html`
- command: `check`
  find every page
  for all framework features, ensure the files pointed to are valid
    (they exist - no validating HTML / JS / CSS)
  - todo (validate): ensure all `error/` pages are valid HTTP errors
- command: `serve`
  take `dist`, map out all the subdirectories
  for each, begin listening on localhost:80 (or whatever the HTTP port is)
  when a request comes through, serve the appropriate file
  - todo: how would this run the relevant server-side JS / do slugs?
  if not found, serve appropriate errors
  - todo: `errors` directory? (eg. `error/404.html`, ect.)
- command: `init`
  generate an `rtc.conf`
    - every rule is present, value is `default`
  generate the directories, at their default values
  generate an `pages/index.html` file and a `layouts/default.html` with sane content
- command: `new [name]`
  create a new directory, named `name`
  change into this new directory, and run `init`

## caveats & notes

- caveat: css is not scoped.
  - idiomacy: general CSS is discoraged (styling `*`, div, ect..)
- fix: JS can be scoped using modules.
  - caveat: cannot use members declared in other scripts
    - fix, todo: research `this` / `globalThis` / `window`

## project structure

```
[root; default: `.`]
|> rtc.conf?
|- dist
|- pages
|  |- subdirectories
|  |> *.html files (pages)
|- errors
|  |> [error code].html files (pages, displayed on errors)
|- components
|  |> *.html files (components)
|- layouts
|  |> *.html files (layouts)
|- [styles]
|- [assets]
```

## config

`rtc.conf` file.

if a rule is not present, the default value is assumed.
if a the `rtc.conf` file is not present, all rules are assumed.

a line must follow either syntax:
`rule: value`
-> rule is a string which must match a config option
-> value is a string which is handled by the program,
   or the keyword `default`, which uses the default value specified below
`//`
-> comment
-> the line is ignored
-> no inline / multiline comments (literally just a config file lol)
``
-> whitespace

rules:
- `root`
  sets: the base directory other directories are calculated off of.
  value: an alternative root directory.
  default: `.`
- `pages`, `errors`, `layouts`, `dist`
  sets: respective directory
  value: an alternative path for the respective directory. 
  default: the respective name (eg. `pages/`)
- `include_base`
  sets: the path used to base includes
  value: an alternative path
  default: `components/`
- rel_paths:
  sets: how relative paths for directives will be calculated
  values: `base` -> from the directory configured
                    eg. the value specified by `components` or `layouts` (or the respctive defaults)
          `root` -> from the project root, as defined by `root`
          `[path]` -> from the specified path
  default: `base`

## directives

- syntax:
  `<!--- @[directive name] [args, if any] -->`
- `include [path]`
  include a file at `path`. defaults to 
- `using [path]`
  declares a page to be using a layout declared at `path`
- `slot`
  declares a layout slot.

## libraries

- a JS library to do framework stuff
- `alpinejs` compatibility / clone?

