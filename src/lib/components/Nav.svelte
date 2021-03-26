<!-- import Link from 'next/link';
import { useCart } from '../lib/cartState';
import CartCount from './CartCount';
import SignOut from './SignOut';
import NavStyles from './styles/NavStyles';
import { useUser } from './User'; -->
<script lang="ts">
    import { navStyles } from "$lib/styles/NavStyles";
</script>

<ul class={navStyles()}>
    <a href="/products">Products</a>
    <a href="/sell">Sell</a>
    <a href="/order">Orders</a>
    <a href="/account">Account</a>

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
