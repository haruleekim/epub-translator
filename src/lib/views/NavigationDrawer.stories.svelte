<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import Epub from "$lib/core/epub";
	import sample from "$lib/data/sample.epub?url";
	import NavigationDrawer from "$lib/views/NavigationDrawer.svelte";

	const epub = await Epub.load(sample);
	const path = epub.getSpineItem(0)!.path;

	const { Story } = defineMeta({
		component: NavigationDrawer,
		args: { epub, path, onPathChange: (path) => console.log(path), opened: true },
	});
</script>

<Story name="Default" />
