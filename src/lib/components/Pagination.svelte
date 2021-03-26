<script lang="ts">
    import { perPage } from "../../../config";
    import DisplayError from "./ErrorMessage.svelte";
    import { operationStore, query } from "@urql/svelte";
    import PaginationStyles from "../styles/PaginationStyles";

    export let page: number = 1;

    const PAGINATION_QUERY = operationStore(`
    query PAGINATION_QUERY {
      _allProductsMeta {
        count
      }
    }
  `);

    query(PAGINATION_QUERY);

    $: console.log({ $PAGINATION_QUERY, count });
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
    <div class={PaginationStyles()}>
        <a href={`/products/${+page - 1}`} aria-disabled={page <= 1}> Prev </a>
        <p>Page {page} of {PageCount}</p>
        <p>{count} Items Total</p>
        <a href={`/products/${+page + 1}`} aria-disabled={page >= PageCount}
            >Next</a
        >
    </div>
{/if}

<style lang="scss">
    .pagination {
        text-align: center;
        display: inline-grid;
        grid-template-columns: repeat(4, auto);
        align-items: stretch;
        justify-content: center;
        align-content: center;
        margin: 2rem 0;
        border: 1px solid var(--lightGray);
        border-radius: 10px;
        & > * {
            margin: 0;
            padding: 15px 30px;
            border-right: 1px solid var(--lightGray);
            &:last-child {
                border-right: 0;
            }
        }
        a[aria-disabled="true"] {
            color: grey;
            pointer-events: none;
        }
    }
</style>
