<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Translator from "@/lib/translator";
    import sample from "@/tests/sample.epub?url";
    import PartitionSelector from "./PartitionSelector.svelte";

    const translator = await Translator.load(sample);
    const blob = await translator.getSpineItem(2)!.getBlob();
    const content = await blob.text();

    const { Story } = defineMeta({
        component: PartitionSelector,
        args: { content, onSelectionChange: (partition) => console.log(partition) },
    });
</script>

<Story name="Default" />
