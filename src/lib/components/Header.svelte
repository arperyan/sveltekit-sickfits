<script context="module">
    export const prerender = true;
</script>

<script lang="ts">
    import { page } from "$app/stores";
    import Nav from "$components/Nav.svelte";
    import { css } from "../../../stitches.config";
    import Search from "./Search.svelte";

    $: section = $page.path.split("/")[1];

    const headers = css({
        ".bar": {
            borderBottom: "10px solid $colors$black",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            justifyContent: "space-between",
            alignItems: "stretch",
        },

        ".logo": {
            fontSize: "$fontSizes$7",
            marginLeft: "2rem",
            position: "relative",
            zIndex: "2",
            transform: "skew(-7deg)",
            background: "$colors$red",
            textDecoration: "none",
            textTransform: "uppercase",
            padding: "0.5rem 1rem",
            "& a": {
                color: "$colors$white",
            },
        },
    });
</script>

<header class={headers()}>
    <div class="bar">
        <h1 class="logo">
            <a href="/">Sick fits</a>
        </h1>
        <Nav {section} />
    </div>
    <Search />
</header>

<!-- <Cart /> -->
