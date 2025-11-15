<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import FileTree from "$lib/components/FileTree.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class: ClassValue | null } = $props();
	const cx = getWorkspaceContext();
</script>

<FileTree
	class={props.class}
	paths={cx.project.epub.listSpinePaths()}
	activePath={cx.path}
	onSelect={async (newPath) => {
		if (cx.locked) return;
		cx.path = newPath;
		cx.partition = null;
		cx.mode = "navigate-resources";
	}}
/>
