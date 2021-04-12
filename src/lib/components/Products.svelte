<script lang="ts">
    import Product from "$components/Product.svelte";

    export let allProduct;
    $: ({ data, error } = allProduct);
    $: console.log(data);
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
