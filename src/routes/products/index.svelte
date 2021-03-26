<script>
  import Pagination from "$lib/components/Pagination.svelte";
  import Products from "$lib/components/Products.svelte";
</script>

<div>
  <Pagination page={1} />
  <Products page={1} />
  <Pagination page={1} />
</div>
