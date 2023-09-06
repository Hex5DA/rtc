#! node

import express from "express";
import fs from "fs";
import path, { resolve } from "path";

import { ssrFile } from "./ssr.js";

const args = { named: {}, positionals: [] };
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
        args.named[arg.slice(2)] = process.argv[++i];
    } else {
        args.positionals.push(arg);
    }
}

if (args.positionals.length !== 1) {
    console.error("usage: index.js <source directory> [--imports <file>]");
    process.exit(1);
}

if (args.named.imports !== undefined && !fs.existsSync(args.named.imports)) {
    console.error(`error: specified imports file '${args.named.imports}' does not exist`);
    process.exit(1);
}

const sourceDir = resolve(args.positionals[0]);
const exists = filename => fs.existsSync(resolve(filename)) ? resolve(filename) : null;
const importsPath = args.named.imports ? resolve(args.named.imports) : exists("imports.mjs") ?? exists("imports.js") ?? null;
const imports = importsPath ? await import(`file://${importsPath}`) : {};

const app = express();
const re = /\[([\w ]+)\]/g;

// we sort the files such that dynamic routes always come last.
// this is because `expressjs` routes are first-come first-serve.
const files = fs.readdirSync(`${sourceDir}/`, { recursive: true });
files.sort((a, b) => {
    if (re.test(a)) return 1;
    if (re.test(b)) return -1;
    return 0;
});

function strStripEnd(str, pattern) {
    if (!str.endsWith(pattern)) return null;
    return str.slice(0, -pattern.length);
}

for (const file of files) {
    const filePath = path.resolve(`${sourceDir}/${file}`);
    if (fs.lstatSync(filePath).isFile()) {
        const base = strStripEnd(file, ".html");
        if (base === null) continue;
        const rawUrl = strStripEnd(base, "index") ?? base;
        const url = rawUrl.replaceAll(re, (_, cap) => `:${cap}`);

        app.get(`/${url}`, async (req, res) => {
            const contents = await ssrFile(filePath, req.params, req.query, imports);
            res.contentType("text/html").send(contents);
        });
    }
}

const port = args.named.port ?? 8080;
app.listen(port, () => {
    console.log(`directory scanned; now listening on port ${port}.`);
});

