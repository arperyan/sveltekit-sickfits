<script>
  import Nav from "$lib/components/Nav.svelte";
</script>

<header class="bar">
  <h1 class="logo">
    <div href="/">Sick fits</div>
  </h1>
  <Nav />

  <!-- <Search /> -->
  <!-- <Cart /> -->
</header>

<style lang="scss">
  .bar {
    border-bottom: 10px solid var(--black, black);
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: space-between;
    align-items: stretch;
  }

  .logo {
    font-size: 4rem;
    margin-left: 2rem;
    position: relative;
    z-index: 2;
    transform: skew(-7deg);
    background: red;
    color: white;
    text-decoration: none;
    text-transform: uppercase;
    padding: 0.5rem 1rem;
  }
</style>
