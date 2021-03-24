<script>
  import Product from "./Product.svelte";
  import { operationStore, query } from "@urql/svelte";

  const allProducts = operationStore(`
        query {
          allProducts {
            id
            name
            description
            photo {
              id
              image {
                publicUrlTransformed
              }
            }
            price
          }
        }
      `);

  query(allProducts);
</script>

<svelte:head>
  <title>Sick Fits</title>
</svelte:head>

{#if $allProducts.fetching}
  <p>Loading...</p>
{:else if $allProducts.error}
  <p>Oh no... {$allProducts.error.message}</p>
{:else}
  <div class="product-list">
    {#each $allProducts?.data.allProducts as product}
      <Product {product} />
    {/each}
  </div>
{/if}

<style lang="scss">
  .product-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 60px;
  }
</style>
