<script context="module">
    export async function load({ context }) {
        let { client } = context;

        const GET_ALL = `
               query {
                    allProducts (sortBy: [name_ASC]) {
                        id
                        name
                        description
                        photo {
                            id
                            image {
                                id
                                publicUrlTransformed
                                }
                            }
                            price
                        }
                    }`;
        let listProducts = await client.query(GET_ALL).toPromise();

        return { props: { listProducts } };
    }
</script>

<script>
    import Product from "$lib/components/Product.svelte";

    export let listProducts;
    $: ({ data, error } = listProducts);
</script>

<svelte:head>
    <title>Sick Fits</title>
</svelte:head>

{#if error}
    <p>Oh no... {error.message}</p>
{:else}
    <div class="product-list">
        {#each data?.allProducts as product}
            <Product {product} />
        {/each}
    </div>
{/if}

<style>
    .product-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-gap: 60px;
    }
</style>
