import express from "express";
import fs from "fs";
import path from "path";

import { ssrFile } from "../ssr/index.js";

const app = express();
const re = /\[([\w ]+)\]/g;

// const dir = process.argv[2];
const files = fs.readdirSync("dist/", { recursive: true });
// we sort the files such that dynamic routes always come last.
// this is because `expressjs` routes are first-come first-serve.
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
    const filePath = path.resolve(`dist/${file}`);
    if (fs.lstatSync(filePath).isFile()) {
        const base = strStripEnd(file, ".html");
        if (base === null) continue;
        const rawUrl = strStripEnd(base, "index") ?? base;
        const url = rawUrl.replaceAll(re, (_, cap) => `:${cap}`);
        
        app.get(`/${url}`, async (req, res) => {
            const contents = await ssrFile(filePath, req.params, req.query);
            res.contentType("text/html").send(contents);
        });
    }
}

app.listen(8080, () => { });

