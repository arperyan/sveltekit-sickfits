const sveltePreprocess = require("svelte-preprocess");
const adapter = require(process.env.ADAPTER || "@sveltejs/adapter-node");
const options = JSON.stringify(process.env.OPTIONS || "{}");
const pkg = require("./package.json");

/** @type {import('@sveltejs/kit').Config} */
module.exports = {
    // Consult https://github.com/sveltejs/svelte-preprocess
    // for more information about preprocessors
    preprocess: [
        sveltePreprocess({
            replace: [
                [
                    "import.meta.env.VERCEL_ANALYTICS_ID",
                    JSON.stringify(process.env.VERCEL_ANALYTICS_ID),
                ],
            ],
        }),
        //	{
        // defaults: {
        // 	style: "postcss",
        // },
        // postcss: true
        //  }),
    ],
    kit: {
        // By default, `npm run build` will create a standard Node app.
        // You can create optimized builds for different platforms by
        // specifying a different adapter
        adapter: adapter(options),

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
