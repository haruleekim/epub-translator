<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import Epub from "$lib/core/epub";
	import Project from "$lib/core/project";
	import sample from "$lib/data/sample.epub?url";

	const epub = await Epub.load(sample);
	const project = Project.create(epub, "eng", "kor");
	const resource = project.getSpineItem(2)!;
	const blob = await resource.getBlob();

	async function transformUrl(url: string) {
		const path = Epub.resolvePath(url, resource.path);
		const transformedUrl = await project.getResource(path)?.getUrl();
		return transformedUrl ?? url;
	}

	const { Story } = defineMeta({
		component: ContentViewer,
		args: { data: blob, transformUrl, class: "w-full h-full" },
		parameters: { layout: "fullscreen" },
	});
</script>

<Story name="Default" />

<style lang="postcss">
	@reference '../../app.css';

	:global(#storybook-root) {
		@apply h-screen;
	}
</style>
