<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import Epub from "$lib/core/epub";
	import sample from "$lib/data/sample.epub?url";
	import NavigationDrawer from "$lib/views/NavigationDrawer.svelte";

	const epub = await Epub.load(sample);
	let path = $derived<string | null>(epub.getSpineItem(0)!.path);

	const { Story } = defineMeta({ component: NavigationDrawer });
</script>

<Story
	name="Default"
	args={{
		epub,
		path,
		onPathChange: (newPath) => (path = newPath), // FIXME: not working
		opened: true,
	}}
/>
