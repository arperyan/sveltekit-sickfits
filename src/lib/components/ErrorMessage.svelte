<script lang="ts">
  interface IError {
    networkError: string;
    message: string;
  }

  export let error: IError;
</script>

{#if error.networkError && error.networkError.result && error.networkError.result.errors.length}
  {#each error.networkError.result.errors as error}
    <div class="error">
      <p data-test="graphql-error">
        <strong>Shoot!</strong>
        {error.message.replace("GraphQL error: ", "")}
      </p>
    </div>
  {/each}
{/if}

<style lang="scss">
  .error {
    padding: 2rem;
    background: white;
    margin: 2rem 0;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-left: 5px solid red;
    p {
      margin: 0;
      font-weight: 100;
    }
    strong {
      margin-right: 1rem;
    }
  }
</style>
