<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import Translator from "@/core/translator";
    import sample from "@/tests/sample.epub?url";
    import ContentViewer from "./ContentViewer.svelte";

    const translator = await Translator.load(sample);
    const resource = translator.getSpineItem(2)!;
    const blob = await resource.getBlob();

    async function transformUrl(url: string) {
        const path = Epub.resolvePath(url, resource.path);
        const transformedUrl = await translator.getResource(path)?.getUrl();
        return transformedUrl ?? url;
    }

    const { Story } = defineMeta({
        component: ContentViewer,
        args: { blob, transformUrl, class: "w-full h-full" },
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
