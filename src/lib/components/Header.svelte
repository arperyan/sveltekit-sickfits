<script context="module">
    export const prerender = true;
</script>

<script lang="ts">
    import { page } from "$app/stores";
    import Nav from "$components/Nav.svelte";
    import Search from "./Search.svelte";

    $: section = $page.path.split("/")[1];
</script>

<header>
    <div class="bar">
        <h1 class="logo">
            <a href="/">Sick fits</a>
        </h1>
        <Nav {section} />
    </div>
    <Search />
</header>

<!-- <Cart /> -->
<style>
    .bar {
        border-bottom: 10px solid black;
        display: grid;
        grid-template-columns: auto 1fr;
        justify-content: space-between;
        align-items: stretch;
    }

    .logo {
        font-size: 4rem;
        margin-left: 2rem;
        position: relative;
        z-index: 2;
        transform: skew(-7deg);
        background: var(--sx-colors-red);
        text-decoration: none;
        text-transform: uppercase;
        padding: 0.5rem 1rem;
    }
    .logo a {
        color: white;
    }
</style>
