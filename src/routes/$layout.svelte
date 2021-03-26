<script>
    import Header from "$lib/components/Header.svelte";
    // import "../global.scss";
    import { endpoint, prodEndpoint } from "../../config";

    import { createClient, setClient } from "@urql/svelte";
    import { css } from "../../stitches.config";
    import { globalStyles } from "$lib/styles/global";

    globalStyles();

    const buttons = css({
        backgroundColor: "green",
        borderRadius: "15px",
        border: "0px",
        fontSize: "13px",
        padding: "10px 15px",
        "&:hover": {
            backgroundColor: "lightgray",
        },
        variants: {
            size: {
                small: { height: "25px" },
                large: { height: "35px" },
            },
        },
    });
    const client = createClient({
        url: prodEndpoint,
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
