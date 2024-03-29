const sveltePreprocess = require("svelte-preprocess");
//const alias = require("@rollup/plugin-alias");
const { resolve } = require("path");
//const commonjs = require("@rollup/plugin-commonjs");
//const node = require('@sveltejs/adapter-node');
import vercel from "@sveltejs/adapter-vercel";
//const static = require("@sveltejs/adapter-static");

const adapter = require(process.env.ADAPTER || "@sveltejs/adapter-node");
const options = JSON.stringify(process.env.OPTIONS || "{}");
const pkg = require("./package.json");

/** @type {import('@sveltejs/kit').Config} */
module.exports = {
    // Consult https://github.com/sveltejs/svelte-preprocess
    // for more information about preprocessors
    preprocess: [
        sveltePreprocess({
            defaults: {
                script: "typescript",
            },
            // postcss: true
        }),
    ],
    kit: {
        // By default, `npm run build` will create a standard Node app.
        // You can create optimized builds for different platforms by
        // specifying a different adapter
        adapter: vercel(),

        // hydrate the <div id="svelte"> element in src/app.html
        target: "#svelte",
        prerender: {
            pages: ["*"],
        },
        vite: {
            ssr: {
                noExternal: [
                    "@rollup/plugin-alias",
                    "@stitches/core",
                    "@urql/core",
                    "@urql/exchange-graphcache",
                    "@urql/exchange-multipart-fetch",
                    "@urql/svelte",
                    "nprogress",
                    "svelte-seo",
                    "wonka",
                ],
                external: ["@emotion/css"],
            },
            optimizeDeps: {
                exclude: [
                    "@urql/svelte",
                    "@urql/exchange-multipart-fetch",
                    "@stitches/core",
                ],
            },
            resolve: {
                alias: {
                    $components: resolve(__dirname, "./src/lib/components"),
                },
            },
            // or resolve: { alias: [{ find: "@lib", replacement: "src/lib" }] },
            //plugins: [commonjs()],
            // plugins: [
            //     alias({
            //         entries: {
            //             $components: path.resolve(
            //                 projectRootDir,
            //                 "src/lib/components"
            //             ),
            //         },
            //     }),
            // ],
        },
    },
};
