<script>
    import formatMoney from "$lib/formatMoney";
    import { itemStyles } from "$lib/styles/ItemStyles";

    export let product;
</script>

<div class={itemStyles()}>
    <img src={product?.photo?.image?.publicUrlTransformed} alt={product.name} />
    <h3>
        <a href={`/product/${product.id}`}>{product.name}</a>
    </h3>
    <span class="pricetag">{formatMoney(product.price)}</span>
    <p>{product.description}</p>
    <div class="buttonList">
        <a
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

<style lang="scss">
    h3 {
        margin: 0 1rem;
        text-align: center;
        transform: skew(-5deg) rotate(-1deg);
        margin-top: -3rem;
        text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
        a {
            background: var(--colors-red);
            display: inline;
            line-height: 1.3;
            font-size: 3rem;
            text-align: center;
            color: white;
            padding: 0 1rem;
        }
    }
    p {
        padding: 0 1rem;
    }
    .pricetag {
        background: var(--colors-red);
        transform: rotate(3deg);
        color: var(--colors-white);
        font-weight: 600;
        padding: 5px;
        line-height: 1;
        font-size: 2rem;
        display: inline-block;
        position: absolute;
        top: -3px;
        right: -3px;
    }
</style>
