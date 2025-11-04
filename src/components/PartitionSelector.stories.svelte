<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Epub from "@/core/epub";
    import sample from "@/tests/sample.epub?url";
    import PartitionSelector from "./PartitionSelector.svelte";

    const epub = await Epub.load(sample);
    const blob = await epub.getSpineItem(2)!.getBlob();
    const content = await blob.text();

    const { Story } = defineMeta({
        component: PartitionSelector,
        args: { content },
    });
</script>

<Story name="Default" />
