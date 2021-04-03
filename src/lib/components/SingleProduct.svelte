<script lang="ts">
    import DisplayError from "$components/ErrorMessage.svelte";
    import { operationStore, query } from "@urql/svelte";
    import { css } from "../../../stitches.config";

    export let id: string;

    const productStyles = css({
        display: "grid",
        gridAutoColumns: "1fr",
        gridAutoFlow: "column",
        maxWidth: "$sizes$maxWidth",
        justifyContent: "center",
        alignItems: "top",
        gap: "2rem",
        img: {
            width: "100%",
            objectFit: "contain",
        },
    });

    const SINGLE_ITEM_QUERY = operationStore(
        `
    query SINGLE_ITEM_QUERY($id: ID!) {
        Product(where: { id: $id }) {
            name
            price
            description
            photo {
                altText
                image {
                    publicUrlTransformed
                }
            }
        }
    }
    `,
        {
            id: id,
        }
    );

    query(SINGLE_ITEM_QUERY);
    $: console.log($SINGLE_ITEM_QUERY);
</script>

<svelte:head>
    <title
        >{`Sick Fits ${
            !$SINGLE_ITEM_QUERY.fetching
                ? `| ${$SINGLE_ITEM_QUERY.data.Product.name}`
                : ""
        }`}</title
    >
</svelte:head>

{#if $SINGLE_ITEM_QUERY.fetching}
    <p>Loading...</p>
{:else if $SINGLE_ITEM_QUERY.error}
    <DisplayError {error} />
{:else}
    <div class={productStyles()}>
        <img
            src={$SINGLE_ITEM_QUERY.data.Product.photo.image
                .publicUrlTransformed}
            alt={$SINGLE_ITEM_QUERY.data.Product.photo.altText}
        />
        <div class="details">
            <h2>{$SINGLE_ITEM_QUERY.data.Product.name}</h2>
            <p>{$SINGLE_ITEM_QUERY.data.Product.description}</p>
        </div>
    </div>
{/if}
