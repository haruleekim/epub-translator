<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import sample from "@/tests/sample.epub?url";
    import ContentView from "./ContentView.svelte";

    const epub = await Epub.load(sample);
    const resource = epub.getSpineItem(2)!;
    const blob = await resource.getBlob();

    async function transformUrl(url: string) {
        const path = Epub.resolvePath(url, resource.path);
        const transformedUrl = await epub.getResource(path)?.getUrl();
        return transformedUrl ?? url;
    }

    const { Story } = defineMeta({
        component: ContentView,
        args: { blob, transformUrl },
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" />

<style lang="postcss">
    @reference '../tailwind.css';

    :global(#storybook-root) {
        @apply h-screen;
    }
</style>
