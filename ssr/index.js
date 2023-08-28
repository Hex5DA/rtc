#! node

// notes / TODOs:
// - doesn't work with JS modules
// - no slugs

import { JSDOM } from "jsdom";
import fs from "fs";
import { resolve } from "path";

const args = { named: {}, positionals: [] };
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
        args.named[arg.slice(2)] = process.argv[++i];
    } else {
        args.positionals.push(arg);
    }
}

if (args.positionals.length != 2) {
    console.error("usage: script.js <input> <output> [--imports <file>]");
    process.exit(1);
}

if (args.named.imports !== undefined && !fs.existsSync(args.named.imports)) {
    console.error(`error: specified imports file '${args.named.imports}' does not exist`);
    process.exit(1);
}

const exists = filename => fs.existsSync(resolve(filename)) ? resolve(filename) : null; 
const importsPath = args.named.imports ? resolve(args.named.imports) : exists("imports.mjs") ?? exists("imports.js") ?? null;
const imports = importsPath ? await import(`file://${importsPath}`) : {};

const dom = await JSDOM.fromFile(process.argv[2], { 
    runScripts: "dangerously",
    resources: "usable",
    beforeParse: window => {
        // declare the server context.
        window.server = {
            fs: fs,
            imports: imports,
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
    document.head.insertAdjacentHTML(
        'afterbegin',
        '<script>const server = {};</script>'
    );
`);

// this output is pretty disgusting-ly formatted, but _ehhhhhh_
fs.writeFileSync(process.argv[3], dom.serialize());
