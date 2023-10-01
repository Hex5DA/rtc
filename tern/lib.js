import { pathToFileURL } from "url";
import { resolve } from "path";
import fs from "fs";

export function parseArgs(argv) {
    const args = { named: {}, positionals: [] };
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            args.named[arg.slice(2)] = argv[++i];
        } else {
            args.positionals.push(arg);
        }
    }

    return args;
}

export const exists = filename => fs.existsSync(resolve(filename)) ? resolve(filename) : null;
export async function getImports(namedPath) {
    if (namedPath && !fs.existsSync(namedPath)) {
        console.error(`error: specified imports file '${namedPath}' does not exist`);
        process.exit(1);
    }

    const importsPath = namedPath ? resolve(namedPath) : exists("imports.mjs") ?? exists("imports.js") ?? null;
    return importsPath ? await import(`file://${importsPath}`) : {};
}

// <https://stackoverflow.com/a/71925565>
export function runAsMain(meta, argv) {
    const path = fs.realpathSync(argv[1]);
    const url = pathToFileURL(path).href;
    return meta === url;
}

export const sleep = timeout => new Promise(r => setTimeout(r, timeout));
