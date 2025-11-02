<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Navbar from "./Navbar.svelte";

    const { Story } = defineMeta({
        title: "Navbar",
        component: Navbar,
        tags: ["autodocs"],
        argTypes: {},
        args: {
            onchange: (mode) => console.log(mode),
        },
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" />
