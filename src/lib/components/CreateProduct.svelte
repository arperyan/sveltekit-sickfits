<script context="module">
</script>

<script lang="ts">
    //import useForm from "../lib/useForm";
    import { forms } from "$lib/styles/Form";
    import DisplayError from "$components/ErrorMessage.svelte";
    import { CombinedError, mutation, gql } from "@urql/svelte";

    import { goto } from "$app/navigation";

    interface Product {
        name: string;
        price: number;
        description: string;
    }

    interface productResult {
        fetching?: boolean;
        error?: CombinedError;
        data?: any;
    }

    let input: Product = {
        name: "Nice Shoe",
        price: 34,
        description: "test",
    };
    let files: File;
    let result: productResult = {};
    let data = {
        key: 1,
        query: gql`
            mutation(
                $name: String!
                $description: String!
                $price: Int!
                $image: Upload
            ) {
                createProduct(
                    data: {
                        name: $name
                        description: $description
                        price: $price
                        status: "AVAILABLE"
                        photo: { create: { image: $image, altText: $name } }
                    }
                ) {
                    id
                    price
                    description
                    name
                }
            }
        `,
    };

    const CREATE_PRODUCT_MUTATION = mutation(data);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { name, price, description } = input;
        //console.log({ name, price, description }, files[0]);

        result = await CREATE_PRODUCT_MUTATION({
            name: name,
            price: price,
            description: description,
            image: files[0],
        });

        input = {
            name: "",
            price: null,
            description: "",
        };
        //files = new File([""], "filename");
        goto(`product/${result.data.createProduct.id}`);
    };

    //$: console.log(result);
</script>

<form class={forms()} on:submit={handleSubmit}>
    {#if result.error}
        <DisplayError error={result.error} />
    {/if}
    <fieldset disabled={result.fetching} aria-busy={result.fetching}>
        <label for="image">
            Image
            <input required type="file" id="image" name="image" bind:files />
        </label>
        <label for="name">
            Name
            <input
                type="text"
                id="name"
                name="name"
                placeholder="name"
                bind:value={input.name}
            />
        </label>
        <label for="price">
            Price
            <input
                type="number"
                id="price"
                name="price"
                placeholder="price"
                bind:value={input.price}
            />
        </label>
        <label for="description">
            Description
            <textarea
                id="description"
                name="description"
                placeholder="description"
                bind:value={input.description}
            />
        </label>
        <button type="submit">+ Add Product</button>
    </fieldset>
</form>
