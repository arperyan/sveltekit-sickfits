<script lang="ts">
  import Product from "./Product.svelte";
  import { operationStore, query } from "@urql/svelte";
  import { perPage } from "../../../config";

  export let page: number;

  const graphql = String.raw;

  const ALL_PRODUCTS_QUERY = operationStore(
    graphql`
      query ALL_PRODUCTS_QUERY($skip: Int = 0, $first: Int) {
        allProducts(first: $first, skip: $skip) {
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
    `,
    { skip: page * perPage - perPage, first: perPage },
    { requestPolicy: "cache-and-network" }
  );

  query($ALL_PRODUCTS_QUERY);

  $: console.log($ALL_PRODUCTS_QUERY);
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
    {#each $ALL_PRODUCTS_QUERY?.data.ALL_PRODUCTS_QUERY as product}
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
