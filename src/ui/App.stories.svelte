<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import sample from "@/tests/sample.epub?url";
    import App from "./App.svelte";

    const epub = await Epub.load(sample);

    const { Story } = defineMeta({
        component: App,
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" args={{ epub }} />
