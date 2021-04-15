<script>
    import formatMoney from "$lib/formatMoney";
    import { itemStyles } from "$lib/styles/ItemStyles";

    export let product;
</script>

<div class={itemStyles()}>
    <img src={product?.photo?.image?.publicUrlTransformed} alt={product.name} />
    <h1>
        <a sveltekit:prefetch href={`/product/${product.id}`}>{product.name}</a>
    </h1>
    <span class="pricetag">{formatMoney(product.price)}</span>
    <p>{product.description}</p>
    <div class="buttonList">
        <a
            sveltekit:prefetch
            href={{
                pathname: "/update",
                query: {
                    id: product.id,
                },
            }}
        >
            Edit Product
        </a>
        <!-- <AddToCart id={product.id} />
    <DeleteProduct id={product.id}>Delete</DeleteProduct> -->
    </div>
</div>

<style>
    h1 {
        margin: 0 1rem;
        text-align: center;
        transform: skew(-5deg) rotate(-1deg);
        margin-top: -3rem;
        text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
    }
    a {
        background: var(--sx-colors-red);
        display: inline;
        line-height: 1.3;
        font-size: 4rem;
        color: var(--sx-colors-white);
        text-align: center;
        padding: 0 1rem;
    }

    p {
        padding: 0 1rem;
    }

    .pricetag {
        background: var(--sx-colors-red);
        transform: rotate(3deg);
        color: var(--sx-colors-white);
        font-weight: 600;
        padding: 5px;
        line-height: 1;
        font-size: 3rem;
        display: inline-block;
        position: absolute;
        top: -3px;
        right: -3px;
    }
</style>
