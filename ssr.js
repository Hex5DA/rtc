#! node

// notes / TODOs:
// - doesn't work with JS modules
// - no slugs

import { JSDOM } from "jsdom";
import prettier from "prettier";
import fs from "fs";

if (process.argv.length != 4) {
    console.error("usage: script.js [INPUT] [OUTPUT]");
    process.exit(1);
}

const dom = await JSDOM.fromFile(process.argv[2], { 
    runScripts: "dangerously",
    resources: "usable",
    beforeParse: window => {
        // declare the server context.
        window.server = {
            fs: fs,
        };

        // hack to prevent `window.onload` being overwritten server-side
        // this stops browser-side code being executed :)
        Object.defineProperty(window, "onload", {
            value: () => {},
            enumerable: true,
        });
    },
});

dom.window.eval("server.onload()");
// glue to define `server` for the browser page, to prevent an error.
dom.window.eval(`
    document.body.insertAdjacentHTML(
        'afterbegin',
        '<script>const server = {};</script>'
    );
`);

const output = await prettier.format(dom.serialize(), { parser: "html" });
fs.writeFileSync(process.argv[3], output);
