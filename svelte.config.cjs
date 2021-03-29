const sveltePreprocess = require("svelte-preprocess");
//const node = require('@sveltejs/adapter-node');
const vercel = require("@sveltejs/adapter-vercel");

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

        vite: {
            ssr: {
                noExternal: Object.keys(pkg.dependencies || {}),
            },
            optimizeDeps: { exclude: ["@urql/svelte"] },
        },
    },
};
