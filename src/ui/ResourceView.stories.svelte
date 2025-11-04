<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import ResourceViewer from "@/core/viewer";
    import sample from "@/tests/sample.epub?url";
    import ResourceView from "./ResourceView.svelte";

    const epub = await Epub.load(sample);
    const path = epub.spine[2];
    const resourceViewer = new ResourceViewer(epub);

    const { Story } = defineMeta({
        component: ResourceView,
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" args={{ resourceViewer, path }} />

<style>
    :global(#storybook-root) {
        height: 100vh;
    }
</style>
