<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import HtmlViewer from "$lib/components/HtmlViewer.svelte";
	import { Partition } from "$lib/core/dom";
	import Epub from "$lib/core/epub";
	import sample from "$lib/data/sample.epub?url";
	import Project from "$lib/project.svelte";

	const epub = await Epub.load(sample);
	const project = Project.create(epub, "");
	const resource = project.epub.getSpineItem(2)!;
	const blob = await resource.getBlob();
	const text = await blob.text();

	let partition = Partition.parse("2/3/3-7");
	project.addTranslation(
		resource.path,
		partition,
		await project.getOriginalContent(resource.path, partition),
		"",
	);

	partition = Partition.parse("2/3/7-9");
	project.addTranslation(
		resource.path,
		partition,
		await project.getOriginalContent(resource.path, partition),
		"",
	);

	const { Story } = defineMeta({
		component: HtmlViewer,
		args: {
			html: text,
			translations: project.translationsForPath(resource.path),
			transformUrl: resource.resolveUrl,
			onSelectionChange: (partition) => {
				console.log(partition);
			},
		},
	});
</script>

<Story name="Default" />
