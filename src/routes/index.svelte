<script context="module">
    export const prerender = true;
    export function load({ session }) {
        return {
            redirect: "/products/1",
            status: 301,
        };
    }
</script>
