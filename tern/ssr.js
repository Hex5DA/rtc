import { JSDOM } from "jsdom";

export async function ssrFile(path, slugs, query, imports) {
    const dom = await JSDOM.fromFile(path, {
        runScripts: "dangerously",
        resources: "usable",
        beforeParse: window => {
            // server context.
            window.server = {
                onload: () => { },
                slugs: slugs,
                query: query,
                serverSide: true,
                imports: imports ?? {},
                node: globalThis,
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

