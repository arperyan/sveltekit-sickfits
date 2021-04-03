<script context="module">
    export const prerender = true;
    export const load = async ({ page, fetch }) => {
        let { id } = page.params;

        ///preloaded data also can be added eg POST
        return { props: { id } };
    };
</script>

<script>
    import Pagination from "$components/Pagination.svelte";
    import Products from "$components/Products.svelte";
    // import { page, navigating } from "$app/stores";

    // $: console.log({ page, navigating });
    export let id;
</script>

<div>
    <Pagination page={id || 1} />
    <Products page={id || 1} />
    <Pagination page={id || 1} />
</div>
