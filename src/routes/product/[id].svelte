<script context="module">
    export const prerender = true;
    export const load = async ({ page, fetch }) => {
        let { id } = page.params;

        ///preloaded data also can be added eg POST
        return { props: { id } };
    };
</script>

<script>
    import SingleProduct from "$components/SingleProduct.svelte";
    export let id;
</script>

<SingleProduct {id} />
