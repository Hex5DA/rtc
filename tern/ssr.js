import { JSDOM } from "jsdom";
import fs from "fs";

import * as lib from "./lib.js";

if (lib.runAsMain(import.meta.url, process.argv)) {
    const args = lib.parseArgs(process.argv);
    const imports = lib.getImports(args.named.imports);

    if (args.positionals.length === 0 || args.positionals.length > 2) {
        console.error("usage: node ssr.js <input file> [output file] [--imports <imports file>]");
        console.error("help: if `[output file]` is omitted, the program will print to `stdout`");
        process.exit(1);
    }

    const dom = await ssrFile(args.positionals[0], imports);
    if (args.positionals[1])
        fs.writeFileSync(args.positionals[1], dom.serialize());
    else
        console.log(dom);
}

export async function ssrFile(path, imports, slugs, query) {
    const dom = await JSDOM.fromFile(path, {
        runScripts: "dangerously",
        resources: "usable",
        beforeParse: window => {
            // server context.
            window.server = {
                imports: imports ?? {},
                slugs: slugs ?? {},
                query: query ?? {},
                serverSide: true,
                node: globalThis,
                onload: () => { },
            };

            // hack to prevent `window.onload` being overwritten server-side
            // this stops browser-side code being executed :)
            Object.defineProperty(window, "onload", {
                value: () => { },
                enumerable: true,
            });
        },
    });

    dom.window.eval("server.onload()");
    // browser polyfill
    dom.window.eval(`
        document.head.insertAdjacentHTML(
            'afterbegin',
            '<script>const server = { serverSide: false };</script>'
        );
    `);

    return dom.serialize();
}

