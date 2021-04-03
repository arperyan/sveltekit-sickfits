<script lang="ts">
    import Product from "$components/Product.svelte";
    import { operationStore, query } from "@urql/svelte";

    export let page = 1;
    let perPage = 4;

    const ALL_PRODUCTS_QUERY = operationStore(
        `
        query ALL_PRODUCTS_QUERY($skip: Int = 0, $first: Int) {
            allProducts(first: $first, skip: $skip) {
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
            }
            `,
        { first: perPage, skip: page * perPage - perPage },
        { requestPolicy: "cache-and-network" }
    );

    query(ALL_PRODUCTS_QUERY);

    $: $ALL_PRODUCTS_QUERY.variables.skip = page * perPage - perPage;
</script>

<svelte:head>
    <title>Sick Fits</title>
</svelte:head>

{#if $ALL_PRODUCTS_QUERY.fetching}
    <p>Loading...</p>
{:else if $ALL_PRODUCTS_QUERY.error}
    <p>Oh no... {$ALL_PRODUCTS_QUERY.error.message}</p>
{:else}
    <div class="product-list">
        {#each $ALL_PRODUCTS_QUERY?.data.allProducts as product}
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
