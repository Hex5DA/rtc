import { JSDOM } from "jsdom";
import fs from "fs";

import * as lib from "./lib.js";
import { resolve } from "path";

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
        fs.writeFileSync(args.positionals[1], dom);
    else
        console.log(dom);
}

export async function ssrFile(path, imports, slugs, query) {
    let domDone = false;
    const dom = await JSDOM.fromFile(path, {
        runScripts: "dangerously",
        resources: "usable",
        url: `file://${resolve("dist/")}`,
        beforeParse: window => {
            // server context.
            window.server = {
                imports: imports ?? {},
                slugs: slugs ?? {},
                query: query ?? {},
                serverSide: true,
                node: globalThis,
                /** @param {bool} value */
                set done(value) { domDone = value; },
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

    dom.window.eval(`
        window.addEventListener("load", () => {
            server.onload();
            server.done = true;
        });

        document.head.insertAdjacentHTML(
            'afterbegin',
            '<script>const server = { serverSide: false };</script>'
        );
    `);

    while (!domDone) await lib.sleep(20);
    return dom.serialize();
}

