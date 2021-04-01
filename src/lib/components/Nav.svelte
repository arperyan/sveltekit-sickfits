<script lang="ts">
    import { navStyles } from "$lib/styles/NavStyles";

    export let section: string;
</script>

<ul class={navStyles()}>
    <a
        sveltekit:prefetch
        class:active={section === "products"}
        href="/products/1"
    >
        Products
    </a>
    <a sveltekit:prefetch class:active={section === "sell"} href="/sell">
        Sell
    </a>
    <!--<a sveltekit:prefetch class:active={path === "/order"} href="/order">
        Orders
    </a>
    <a sveltekit:prefetch class:active={path === "/account"} href="/account">
        Account
    </a> -->

    <!-- <SignOut /> -->
    <!-- <button type="button" onClick={openCart}>
            My Cart
            <CartCount
              count={user.cart.reduce(
                (tally, cartItem) =>
                  tally + (cartItem.product ? cartItem.quantity : 0),
                0
              )}
            />
          </button> -->
</ul>
