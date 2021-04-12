<script context="module">
    export const load = async ({ page, context }) => {
        let { id } = page.params;
        let { client } = context;
        console.log("Conetxt", { context, id });
        const GET_TASKS = `
               query ALL_PRODUCTS_QUERY($skip: Int = 0, $first: Int) {
                    allProducts(first: $first, skip: $skip) {
                        id
                        name
                        description
                        photo {
                            id
                            image {
                                id
                                publicUrlTransformed
                                }
                            }
                            price
                        }
                    }`;
        let allProduct = await client
            .query(
                GET_TASKS,
                { skip: id * 4 - 4, first: 4 },
                { requestPolicy: "network-only" }
            )
            .toPromise();
        console.log(allProduct);
        return { props: { id, allProduct } };
    };
</script>

<script>
    import Pagination from "$components/Pagination.svelte";
    import Products from "$components/Products.svelte";

    export let id: number;
    export let allProduct: any;
</script>

<div>
    <Pagination page={id || 1} />
    <Products {allProduct} />
    <Pagination page={id || 1} />
</div>
