<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Navbar from "./Navbar.svelte";

    const { Story } = defineMeta({
        component: Navbar,
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" />
