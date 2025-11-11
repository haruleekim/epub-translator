<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import Epub from "$lib/core/epub";
	import Project from "$lib/core/project";
	import sample from "$lib/data/sample.epub?url";
	import SpineItemView from "$lib/views/SpineItemView.svelte";

	const epub = await Epub.load(sample);
	const project = Project.create(epub, "eng", "kor");

	const { Story } = defineMeta({
		component: SpineItemView,
		args: { project },
		parameters: { layout: "fullscreen" },
	});
</script>

<Story name="Default" />
