<script>
  import Product from "./Product.svelte";

  let product = "test";
</script>

<svelte:head>
  <title>Sick Fits</title>
</svelte:head>

<div class="product-list">
  <!-- {data.allProducts.map((product) => ( -->
  <Product {product} />
  <!-- ))} -->
</div>

<style lang="scss">
  .product-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 60px;
  }
</style>
