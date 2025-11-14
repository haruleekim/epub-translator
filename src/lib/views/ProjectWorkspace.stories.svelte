<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Partition } from "$lib/core/dom";
	import Epub from "$lib/core/epub";
	import sample from "$lib/data/sample.epub?url";
	import Project from "$lib/project";
	import ProjectWorkspace from "$lib/views/ProjectWorkspace.svelte";

	const epub = await Epub.load(sample);
	const project = Project.create(epub, "eng", "kor");
	const resource = project.epub.getSpineItem(2)!;

	let partition = Partition.parse("2/3/3-7");
	let tid = project.addTranslation(
		resource.path,
		partition,
		await project.getOriginalContent(resource.path, partition),
		"",
	);
	project.activateTranslation(tid);

	partition = Partition.parse("2/3/7-9");
	tid = project.addTranslation(
		resource.path,
		partition,
		await project.getOriginalContent(resource.path, partition),
		"",
	);
	project.activateTranslation(tid);

	const { Story } = defineMeta({
		component: ProjectWorkspace,
		args: { project, path: resource.path },
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
