#!/usr/bin/env node

// deployments
// - docker
// - build.sh
// - static (eg. GH pages)
//
// scaffold
// - pages/
//   - index.html
// - layout.html
// - build.sh OR Dockerfile
// - package.json
// - .gitignore
// - imports.mjs

import { execSync } from "child_process";
import * as fs from "fs";
import * as readline from "readline/promises";

const RL = readline.createInterface({
    output: process.stdout,
    input: process.stdin,
});

function sh(command) {
    return execSync(command, (error, stdout, stderr) => {
        if (error || stderr) {
            console.warn(`error when trying to run ${command}.\nerror:${error.message}\nstderr:${stderr}`)
            return "";
        }

        return stdout;
    }).toString();
}

async function choice(prompt, options) {
    let choice;
    do {
        choice = await RL.question(`${prompt} (${Object.keys(options).join(", ")}) `);
    } while (!(choice in options));
    return options[choice];
}

async function yesno(prompt) {
    return await choice(prompt, { "y": true, "n": false });
}

async function checkMkdir(dir) {
    let chosen = dir;
    while (true) {
        if (!fs.existsSync(chosen)) break;
        if (await yesno(`'${chosen}' already exists. delete?`))
            fs.rmSync(chosen, { recursive: true });
        else
            chosen = await RL.question("alternative directory: ");
    }

    fs.mkdirSync(chosen);
    return chosen;
}

const DEPLOYMENTS = [
    {
        name: "shell",
        setup: () => fs.writeFileSync("build.sh", "#!/bin/sh\n"),
        smew: () => fs.appendFileSync("build.sh", "npx rtc-smew\n"),
        tern: () => {
            fs.appendFileSync("build.sh", "cp -r public dist\n");
            fs.appendFileSync("build.sh", "npx rtc-tern dist\n");
        },
        falcon: () => { },
        skua: () => { },
        git: () => { },
    },
];

const COMPONENTS = [
    {
        name: "git",
        setup: () => {
            sh("git init")
            fs.appendFileSync(".gitignore", "node_modules\n");
            fs.appendFileSync(".gitignore", "package-lock.json\n");
        },
    },
    {
        name: "falcon",
        setup: using => {
            sh("npm add rtc-falcon")
            using.falcon.path = "tern" in using ? "./public/falcon.js" : "./falcon.js";
            fs.symlinkSync("./node_modules/rtc-falcon/falcon.js", using.falcon.path, "junction");
        },
    },
    {
        name: "skua",
        setup: using => {
            sh("npm add rtc-skua")
            using.skua.path = "tern" in using ? "./public/skua.css" : "./skua.css";
            fs.symlinkSync("./node_modules/rtc-skua/skua.css", using.skua.path, "junction");
        },
    },
    {
        name: "smew",
        setup: using => {
            sh("npm add rtc-smew");

            fs.mkdirSync("pages/");
            fs.writeFileSync("pages/index.html", "<!-- @layout \"default.html\" -->");

            fs.mkdirSync("layouts/");
            fs.writeFileSync("layouts/default.html", `
<!DOCTYPE html>
<html>
<head>
    <title>${sh("npm pkg get name").trim()}</title>
    ${"skua" in using ? `<link rel=\"stylesheet\" src=\"${using.skua.path}\"></link>` : ""}
    ${"falcon" in using ? `<script src=\"${using.falcon.path}\"></script>` : ""}
</head>
<body>
    <!-- @slot -->
</body>
</html>
            `);

            if ("git" in using)
                fs.appendFileSync(".gitignore", "dist\n");
        },
    },
    {
        name: "tern",
        setup: () => {
            sh("npm add rtc-tern");
            fs.mkdirSync("public/");
        },
    },
];

const args = { named: {}, positionals: [] };
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
        args.named[arg.slice(2)] = process.argv[++i];
    } else {
        args.positionals.push(arg);
    }
}

let projectPath = process.argv[2];
if (!projectPath) {
    console.error("usage: index.js [directory]");
    process.exit(1);
}

projectPath = await checkMkdir(projectPath);
process.chdir(projectPath);
sh("npm init -y");

const deplChoices = DEPLOYMENTS.reduce((res, depl) => {
    res[depl.name] = depl;
    return res;
}, {});

const depl = await choice("choose a deployment:", deplChoices); 
depl.setup();

const using = {}; 
for (const component of COMPONENTS) {
    if (await yesno(`install ${component.name}?`)) {
        using[component.name] = {};
        component.setup(using)
        depl[component.name](using);
    }
}

// HACK: wtf?
process.exit(0);


/*
- symlinks broken
- copying public broken
- ordering broken
- tern broken
- UX broken
- ctrl-C broken 
*/
