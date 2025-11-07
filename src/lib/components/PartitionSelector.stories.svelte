<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import sample from "$lib/data/sample.epub?url";
	import Translator from "$lib/translator";

	const translator = await Translator.load(sample);
	const blob = await translator.getSpineItem(2)!.getBlob();
	const content = await blob.text();

	const { Story } = defineMeta({
		component: PartitionSelector,
		args: { content, onSelectionChange: (partition) => console.log(partition) },
	});
</script>

<Story name="Default" />
