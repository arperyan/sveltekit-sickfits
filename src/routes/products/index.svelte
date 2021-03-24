<script>
  import Products from "$lib/components/Products.svelte";

  // const SINGLE_ITEM_QUERY = gql`
  //   query SINGLE_ITEM_QUERY($id: ID!) {
  //     Product(where: { id: $id }) {
  //       name
  //       price
  //       description
  //       photo {
  //         altText
  //         image {
  //           publicUrlTransformed
  //         }
  //       }
  //     }
  //   }
  // `;
</script>

<svelte:head>
  <title>Sick Fits</title>
</svelte:head>

<div>
  <Products />
</div>
