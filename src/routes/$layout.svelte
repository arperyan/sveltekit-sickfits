<script>
    import { globalStyles } from "$lib/styles/global";
    import Header from "$lib/components/Header.svelte";
    // import "../global.scss";
    import { endpoint, prodEndpoint } from "../../config";
    import { createClient, setClient } from "@urql/svelte";
    import { multipartFetchExchange } from "@urql/exchange-multipart-fetch";
    import { dedupExchange, cacheExchange } from "@urql/svelte";
    import { onMount } from "svelte";

    onMount(() => globalStyles());

    const client = createClient({
        url: prodEndpoint,
        exchanges: [dedupExchange, cacheExchange, multipartFetchExchange],
    });

    setClient(client);
</script>

<main>
    <Header />
    <div class="container">
        <slot />
        <!-- <button class={buttons({ size: "large" })}>Hello Worls</button> -->
    </div>
</main>

<style lang="scss">
    .container {
        max-width: var(--sizes-maxWidth);
        margin: 0 auto;
        padding: 2rem;
    }
</style>
