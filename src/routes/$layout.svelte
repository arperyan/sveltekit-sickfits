<script>
  import Header from "$lib/components/Header.svelte";
  import "../global.scss";

  import { createClient, setClient } from "@urql/svelte";

  const client = createClient({
    url: "http://localhost:3000/api/graphql",
  });

  setClient(client);
</script>

<main>
  <Header />
  <div class="container">
    <slot />
  </div>
</main>

<style lang="scss">
  .container {
    max-width: var(--maxWidth);
    margin: 0 auto;
    padding: 2rem;
  }
</style>
