#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";

const COMP_REG = /<!--\s*@component\s+["|']([^"|']*)["|']\s*-->/gm;
const LAY_REG = /<!--\s*@layout\s+["|']([^"|']*)["|']\s*-->/gm;
const SLOT_REG = /<!--\s*@slot\s*-->/gm;

function walkDir(dir) {
    const entries = [];
    for (const entry of fs.readdirSync(dir)) {
        const absolute = path.join(dir, entry);
        if (fs.lstatSync(absolute).isDirectory()) 
            entries.push(...walkDir(absolute));
        else
            entries.push(absolute);
    }

    return entries;
}

function validPath(root, extract, directive) {
    const absolute = path.join(root, extract);
    if (!fs.existsSync(absolute)) {
        console.error(`${directive} directive given an invalid path: ${extract}`);
        return null;
    }
    return absolute;
}

function onlyOneMatch(str, regex, file, directive) {
    const occ = (str.match(regex) || []).length;

    if (occ === 0) {
        console.error(`file '${file}' does not contain a ${directive} directive`);
        return null;
    } else if (occ > 1) {
        console.error(`files may only contain 1 ${directive} directive`);
        console.error(`(${file} has ${occ}`);
        return null;
    } else {
        return regex.exec(str)[1] ?? "";
    }
}

function resolveComponents(file) {
    const contents = fs.readFileSync(file).toString();
    return contents.replaceAll(COMP_REG, (match) => {
        const absolute = validPath("components/", match, "component");
        if (absolute !== null)
            return resolveComponents(absolute);
        else
            return "";
    });
}

function resolveLayouts(contents, file) {
    const layoutPath = onlyOneMatch(contents, LAY_REG, file, "layout");
    if (layoutPath === null) return contents;

    const layoutPathAbs = validPath("layouts/", layoutPath, "layout");
    if (layoutPathAbs === null) return contents;

    const layoutContents = resolveComponents(layoutPathAbs);
    if (onlyOneMatch(layoutContents, SLOT_REG, file, "slot") === null) return contents;
    return layoutContents.replace(SLOT_REG, contents);
}

function stripBeginning(str, pat) {
    if (!str.startsWith(pat))
        return str;
    return str.slice(pat.length);
}

const DIST = "dist/";
if (fs.existsSync(DIST))
    fs.rmSync(DIST, { recursive: true });

for (const file of walkDir("pages/")) {
    let result = resolveComponents(file);
    result = resolveLayouts(result, file);

    const bare = stripBeginning(file, "pages/");
    const writePath = path.join(DIST, bare);
    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, result);
}

