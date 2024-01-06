#! node

import express from "express";
import fs from "fs";
import path, { resolve } from "path";

import { ssrFile } from "./ssr.js";
import * as lib from "./lib.js";
const exists = lib.exists;

const args = lib.parseArgs(process.argv);
if (args.positionals.length !== 1) {
    console.error("usage: index.js <source directory> [--imports <file>]");
    process.exit(1);
}

const sourceDir = resolve(args.positionals[0]);
const imports = await lib.getImports(args.named.imports);

function errPage(code, reason) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${code}</title>
    <style>
    * {
        font-family: monospace;
        font-size: 100%;
        margin: 0;
    }

    body {
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2vh;
    }

    h1 {
        font-size: 4vw;
        border-bottom: black solid 6px;
        padding: 0 1.5vw; 
        font-weight: bold;
        text-align: center;
    }

    p {
        margin: 0;
        font-size: 2vw;
    }
    </style>
</head>
<body>
    <h1>error - code ${code}</h1>
    <p><i>${reason}</i></p>
</body>
</html>
    `;
}

const app = express();
app.use("/public", express.static(path.resolve("dist/public/")));
const re = /\b__(?<catchall>[a-zA-Z0-9]+)(?=.html|\/index\.html)|\b_([a-zA-Z0-9]+)/gm;

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
        let catchallName;
        const slugged = file.replaceAll(re, (_match, catchall, slug) => {
            catchallName = catchall;
            return catchall ? "*" : `:${slug}`;
        });

        const base = strStripEnd(slugged, ".html");
        if (base === null) continue; // skip non-html files
        const url = strStripEnd(base, "index") ?? base; // index.html should path as directory
        console.log(`/${url}`);

        app.get(`/${url}`, async (req, res, _next) => {
            if (req.params["0"]) {
                req.params[catchallName] = req.params["0"]; // we only allow 1 catchall so this is.. fine
                delete req.params["0"];
            }
            const contents = await ssrFile(filePath, imports, req.params, req.query);
            res.contentType("text/html").send(contents);
        });
    }
}

const err404Path = exists(`${sourceDir}/404.html`) ?? exists(`${sourceDir}/errors/404.html`) ?? null;
const err404 = err404Path ? fs.readFileSync(err404Path) : errPage(404, "page not found");
const err500Path = exists(`${sourceDir}/500.html`) ?? exists(`${sourceDir}/errors/500.html`) ?? null;
const err500 = err500Path ? fs.readFileSync(err500Path) : errPage(500, "internal server error");

app.use((_req, res) => {
    res.status(404).contentType("text/html").send(err404);
});
// do we bother implementing arbritrary errors? (see: <https://auth0.com/blog/how-to-implement-custom-error-responses-in-expressjs/>)
app.use((err, _req, res, _next) => {
    console.error(`server error:\n${err}`);
    res.status(500).contentType("text/html").send(err500);
});

const port = args.named.port ?? 8080;
app.listen(port, () => {
    console.log(`directory scanned; now listening on port ${port}.`);
});

