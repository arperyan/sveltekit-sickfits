<script>
  import Header from "$lib/components/Header.svelte";
  import "../global.scss";
  import { endpoint, prodEndpoint } from "../../config";

  import { createClient, setClient } from "@urql/svelte";

  const client = createClient({
    url: prodEndpoint,
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
