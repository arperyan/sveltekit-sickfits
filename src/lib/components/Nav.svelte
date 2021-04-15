<script lang="ts">
    import { navStyles } from "$lib/styles/NavStyles";

    export let section: string;
</script>

<ul class="nav-style">
    <li>
        <a
            sveltekit:prefetch
            class:active={section === "products"}
            href="/products/1"
        >
            Products
        </a>
    </li>
    <li>
        <a sveltekit:prefetch class:active={section === "sell"} href="/sell">
            Sell
        </a>
    </li>
    <!--<a sveltekit:prefetch class:active={path === /order} href=/order>
        Orders
    </a>
    <a sveltekit:prefetch class:active={path === /account} href=/account>
        Account
    </a> -->

    <!-- <SignOut /> -->
    <!-- <button type=button onClick={openCart}>
            My Cart
            <CartCount
              count={user.cart.reduce(
                (tally; cartItem) =>
                  tally + (cartItem.product ? cartItem.quantity : 0);
                0
              )}
            />
          </button> -->
</ul>

<style lang="scss">
    .nav-style {
        margin: 0;
        padding: 0;
        display: flex;
        justify-self: end;
        font-size: 2rem;
        li {
            padding: 1rem 3rem;
            display: flex;
            align-items: center;
            position: relative;
            text-transform: uppercase;
            font-weight: 900;
            font-size: 1em;
            background: none;
            border: 0;
            cursor: pointer;
        }
        a,
        button {
            @media (max-width: 700px) {
                font-size: 10px;
                padding: 0 10px;
            }
            &:before {
                content: "";
                width: 2px;
                background: var(--sx-colors-lightGray);
                height: 100%;
                left: 0;
                position: absolute;
                transform: skew(-20deg);
                top: 0;
                bottom: 0;
            }
            &:after {
                height: 2px;
                background: var(--sx-colors-red);
                content: "";
                width: 0;
                position: absolute;
                transform: translateX(-50%);
                transition: width 0.4s;
                transition-timing-function: cubic-bezier(1, -0.65, 0, 2.31);
                left: 50%;
                margin-top: 3rem;
            }
            &:hover,
            &:focus {
                outline: none;
                text-decoration: none;
                &:after {
                    width: calc(100% - 60px);
                }
                @media (max-width: 700px) {
                    width: calc(100% - 10px);
                }
            }
        }
        @media (max-width: 1300px) {
            border-top: 1px solid var(--sx-colors-lightGray);
            width: 100%;
            justify-content: center;
            font-size: 1.5rem;
        }
    }
</style>
