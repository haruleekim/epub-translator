<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import HtmlViewer from "$lib/components/HtmlViewer.svelte";
	import Epub from "$lib/core/epub";
	import sample from "$lib/data/sample.epub?url";

	const epub = await Epub.load(sample);
	const resource = epub.getSpineItem(2)!;
	const blob = await resource.getBlob();
	const text = await blob.text();

	const { Story } = defineMeta({
		component: HtmlViewer,
		args: {
			html: text,
			transformUrl: resource.resolveUrl,
			onSelectionChange: (partition) => {
				console.log(partition);
			},
		},
	});
</script>

<Story name="Default" />
