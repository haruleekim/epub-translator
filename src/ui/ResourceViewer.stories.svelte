<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import ResourceViewerManager from "@/core/resource-view-manager";
    import sample from "@/tests/sample.epub?url";
    import ResourceViewer from "./ResourceViewer.svelte";

    const epub = await Epub.load(sample);
    const path = epub.spine[2];
    const resourceViewManager = new ResourceViewerManager(epub);

    const { Story } = defineMeta({
        component: ResourceViewer,
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" args={{ resourceViewManager, path }} />

<style>
    :global(#storybook-root) {
        height: 100vh;
    }
</style>
