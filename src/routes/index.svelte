<script context="module">
    export const prerender = true;
    export function load() {
        return { redirect: "/products/1", status: 301 };
    }
</script>
