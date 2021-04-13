<script context="module">
    import {
        dedupExchange,
        cacheExchange,
        fetchExchange,
        createClient,
    } from "@urql/core";

    export async function load({ fetch, context }) {
        const client = createClient({
            url: prodEndpoint,
            fetch: fetch,
            exchanges: [dedupExchange, cacheExchange, fetchExchange],
        });

        return { props: { client }, context: { client } };
    }
</script>

<script>
    import { globalStyles } from "$lib/styles/global";
    import Header from "$components/Header.svelte";
    //import "../global.css";
    import { prodEndpoint } from "../../config";
    //import { createClient, initClient, setClient } from "@urql/svelte";
    //import { multipartFetchExchange } from "@urql/exchange-multipart-fetch";
    // import { dedupExchange, cacheExchange } from "@urql/svelte";
    import { onMount } from "svelte";
    import { seoData } from "$lib/SEO";
    import SvelteSeo from "svelte-seo";
    import { setClient } from "@urql/svelte";

    onMount(() => globalStyles());

    export let product = [];
    export let client;

    //$: console.log(client);
    // const client = createClient({
    //     url: prodEndpoint,
    //     exchanges: [dedupExchange, cacheExchange, multipartFetchExchange],
    // });

    setClient(client);
</script>

<SvelteSeo {...seoData({})} />

<main>
    <Header />
    <div class="container">
        <slot />
        <!-- /<button class={buttons({ size: "large" })}>Hello Worls</button> -->
    </div>
</main>

<style lang="scss">
    .container {
        max-width: var(--sizes-maxWidth);
        margin: 0 auto;
        padding: 2rem;
    }
</style>
