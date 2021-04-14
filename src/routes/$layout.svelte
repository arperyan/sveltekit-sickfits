<script context="module">
    import {
        dedupExchange,
        cacheExchange,
        fetchExchange,
        createClient,
    } from "@urql/core";

    export function load({ fetch }) {
        const client = createClient({
            url: prodEndpoint,
            fetch: fetch,
            exchanges: [dedupExchange, cacheExchange, fetchExchange],
        });
        let fetching = true;
        return { props: { client, fetching }, context: { client } };
    }
</script>

<script>
    //import { globalStyles } from "$lib/styles/global";
    import Header from "$components/Header.svelte";
    import "../global.css";
    import { prodEndpoint } from "../../config";
    import { afterUpdate, onMount } from "svelte";
    import { seoData } from "$lib/SEO";
    import SvelteSeo from "svelte-seo";
    import { setClient } from "@urql/svelte";
    import Spinner from "$lib/UI/Spinner.svelte";

    //onMount(() => globalStyles());

    export let product = [];
    export let client;
    export let fetching;

    //$: console.log(client);
    // const client = createClient({
    //     url: prodEndpoint,
    //     exchanges: [dedupExchange, cacheExchange, multipartFetchExchange],
    // });
    $: console.log(client);
    setClient(client);

    afterUpdate(() => {
        fetching = false;
    });
</script>

<SvelteSeo {...seoData({})} />

<main>
    <Header />
    {#if fetching}
        <Spinner nav={fetching} />
    {:else}
        <div class="container">
            <slot />
            <!-- /<button class={buttons({ size: "large" })}>Hello Worls</button> -->
        </div>
    {/if}
</main>

<style>
    @import "$lib/styles/test.css";
</style>
