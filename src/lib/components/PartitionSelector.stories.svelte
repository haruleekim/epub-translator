<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import Epub from "$lib/core/epub";
	import Project from "$lib/core/project";
	import sample from "$lib/data/sample.epub?url";

	const epub = await Epub.load(sample);
	const project = Project.create(epub, "eng", "kor");
	const blob = await project.epub.getSpineItem(2)!.getBlob();
	const content = await blob.text();

	const { Story } = defineMeta({
		component: PartitionSelector,
		args: { content, onSelectionChange: (partition) => console.log(partition) },
	});
</script>

<Story name="Default" />
