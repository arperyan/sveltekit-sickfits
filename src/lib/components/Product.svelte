<script>
  export let product;
</script>

<div class="itemstyles">
  <!-- <img
        src={product?.photo?.image?.publicUrlTransformed}
        alt={product.name}
      /> -->
  <h3>
    <!-- <a href={`/product/${product.id}`}>{product.name}</a> -->
  </h3>
  <!-- <span class="pricetag">{formatMoney(product.price)}</span> -->
  <!-- <p>{product.description}</p> -->
  <div class="buttonList">
    <!-- <a
      href={{
        pathname: "/update",
        query: {
          id: product.id,
        },
      }}
    > -->
    Edit Product
    <!-- </a> -->
    <!-- <AddToCart id={product.id} />
    <DeleteProduct id={product.id}>Delete</DeleteProduct> -->
  </div>
</div>

<style lang="scss">
  .itemstyles {
    background: white;
    border: 1px solid var(--offWhite);
    box-shadow: var(--bs);
    position: relative;
    display: flex;
    flex-direction: column;
    img {
      width: 100%;
      height: 400px;
      object-fit: cover;
    }
    p {
      line-height: 2;
      font-weight: 300;
      flex-grow: 1;
      padding: 0 3rem;
      font-size: 1.5rem;
    }
    .buttonList {
      display: grid;
      width: 100%;
      border-top: 1px solid var(--lightGray);
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      grid-gap: 1px;
      background: var(--lightGray);
      & > * {
        background: white;
        border: 0;
        font-size: 1rem;
        padding: 1rem;
      }
    }
  }

  h3 {
    margin: 0 1rem;
    text-align: center;
    transform: skew(-5deg) rotate(-1deg);
    margin-top: -3rem;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
    a {
      background: var(--red);
      display: inline;
      line-height: 1.3;
      font-size: 4rem;
      text-align: center;
      color: white;
      padding: 0 1rem;
    }
  }

  .pricetag {
    background: var(--red);
    transform: rotate(3deg);
    color: white;
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
