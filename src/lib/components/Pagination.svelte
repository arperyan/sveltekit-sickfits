<script lang="ts">
    import { perPage } from "../../../config";
    import DisplayError from "$components/ErrorMessage.svelte";
    import { operationStore, query } from "@urql/svelte";
    import { paginationStyles } from "$lib/styles/paginationStyles";

    export let page: number = 1;

    const PAGINATION_QUERY = operationStore(`
    query PAGINATION_QUERY {
      _allProductsMeta {
        
        count
      }
    }
  `);

    query(PAGINATION_QUERY);

    $: count = $PAGINATION_QUERY.data?._allProductsMeta.count;

    $: PageCount = Math.ceil(count / perPage);
</script>

<svelte:head>
    <title>
        Sick Fits - Page {page} of {PageCount}
    </title>
</svelte:head>

{#if $PAGINATION_QUERY.error}
    <DisplayError error={$PAGINATION_QUERY.error.message} />
{:else}
    <div class={paginationStyles()}>
        <a href={`/products/${+page - 1}`} aria-disabled={page <= 1}> Prev </a>
        <p>Page {page} of {PageCount}</p>
        <p>{count} Items Total</p>
        <a href={`/products/${+page + 1}`} aria-disabled={page >= PageCount}
            >Next</a
        >
    </div>
{/if}
